import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUserLimit } from '@/lib/server/user-limit-check';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  const { tenant_slug, election_slug } = await params;

  // Use service role key to bypass RLS for user creation
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    try {
      const body = await request.json();
      const { firstName, middleName, lastName, email, password, contact, birthDate } = body;

      console.log(`[Registration API] Attempting registration for: ${tenant_slug} / ${election_slug}`);

      // 1. Resolve tenant
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id, slug')
        .eq('slug', tenant_slug)
        .eq('is_verified', true)
        .single();

      if (!tenant) {
        console.error(`[Registration API] Tenant not found or not verified: ${tenant_slug}`);
        return NextResponse.json({ error: 'Tenant not found or not verified' }, { status: 404 });
      }



      // 2. Resolve election
      const { data: election } = await supabaseAdmin
        .from('election')
        .select('id, status')
        .eq('slug', election_slug)
        .eq('tenantID', tenant.id)
        .single();

      if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      if (election.status !== 'ACTIVE') return NextResponse.json({ error: 'Election is not active' }, { status: 403 });

      // 3. Verify filing phase is active (Date-driven check)
      const { data: filingPhase } = await supabaseAdmin
        .from('election phase')
        .select('id, started_at, completed_at')
        .eq('electionID', election.id)
        .eq('phase_type', 'filing')
        .single();

      const isFilingActive = filingPhase?.started_at && !filingPhase?.completed_at;
      if (!isFilingActive) {
        return NextResponse.json({ error: 'Candidate registration is currently closed.' }, { status: 403 });
      }

      // 4. Verify email exists in tenant and is a Voter
      const { data: existingUser } = await supabaseAdmin
        .from('tenant users')
        .select('id, user_type')
        .eq('email', email.toLowerCase())
        .eq('tenantID', tenant.id)
        .maybeSingle();

      if (!existingUser) {
        return NextResponse.json({ 
          error: 'Your email is not registered in the Voter list. Candidate registration is only allowed for registered voters.' 
        }, { status: 400 });
      }

      const userType = existingUser.user_type?.toLowerCase();
      if (userType === 'candidate') {
        return NextResponse.json({ error: 'You are already registered as a Candidate.' }, { status: 400 });
      }

      if (userType !== 'voter') {
        return NextResponse.json({ error: 'Only registered Voters can register as Candidates.' }, { status: 400 });
      }

      // 5. Update auth user metadata, email, and password
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          email: email.toLowerCase().trim(),
          password,
          email_confirm: true,
          user_metadata: {
            tenant_id: tenant.id,
            election_id: election.id,
            role_type: 'Candidate',
            temporary_password: false
          }
        }
      );

      if (authError || !authUser.user) {
        return NextResponse.json({ error: authError?.message || 'Failed to update user credentials' }, { status: 400 });
      }

      // 6. Update tenant_users and candidate (Transactionally)
      const now = new Date().toISOString();

      const { error: updateUserError } = await supabaseAdmin
        .from('tenant users')
        .update({
          first_name: firstName,
          middle_name: middleName || null,
          surname: lastName,
          user_type: 'Candidate',
          contact: contact || null,
          birth_date: birthDate,
          registered_via_election: election.id,
          registered_via_slug: election_slug
        })
        .eq('id', existingUser.id);

      if (updateUserError) {
        return NextResponse.json({ error: 'Failed to update tenant user profile' }, { status: 500 });
      }

      const { error: insertCandidateError } = await supabaseAdmin
        .from('candidate')
        .insert({
          electionID: election.id,
          userID: existingUser.id,
          status: 'DRAFT',
          filedDate: now
          
        });

      if (insertCandidateError) {
        // Revert user_type back to Voter if candidacy record fails
        await supabaseAdmin
          .from('tenant users')
          .update({ user_type: 'Voter' })
          .eq('id', existingUser.id);

        return NextResponse.json({ error: 'Failed to initialize candidacy record' }, { status: 500 });
      }

      return NextResponse.json({ success: true, userId: existingUser.id });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
