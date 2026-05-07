import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

      // 4. Verify email not already in tenant
      const { data: existingUser } = await supabaseAdmin
        .from('tenant users')
        .select('id')
        .eq('email', email)
        .eq('tenantID', tenant.id)
        .single();

      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered for this organization' }, { status: 400 });
      }

      // 5. Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenant.id,
          election_id: election.id,
          role_type: 'Candidate'
        }
      });

      if (authError || !authUser.user) {
        return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
      }

      // 6. Insert tenant_users and candidate (Transactionally)
      const now = new Date().toISOString();

      const { error: insertUserError } = await supabaseAdmin
        .from('tenant users')
        .insert({
          id: authUser.user.id,
          tenantID: tenant.id,
          email: email,
          first_name: firstName,
          middle_name: middleName || null,
          surname: lastName,
          user_type: 'Candidate',
          contact: contact || null,
          birth_date: birthDate,
          registered_via_election: election.id,
          registered_via_slug: election_slug,
          created_at: now
        });

    if (insertUserError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to create tenant user profile' }, { status: 500 });
    }

    const { error: insertCandidateError } = await supabaseAdmin
      .from('candidate')
      .insert({
        electionID: election.id,
        userID: authUser.user.id,
        status: 'DRAFT',
        filedDate: now
      });

    if (insertCandidateError) {
      // Cleanup
      await supabaseAdmin.from('tenant users').delete().eq('id', authUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to initialize candidacy record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: authUser.user.id });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
