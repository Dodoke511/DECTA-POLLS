import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  const { tenant_slug, election_slug } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, password } = await request.json();

    console.log(`[Election Login API] Attempting login for: ${tenant_slug} / ${election_slug}`);

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .eq('is_verified', true)
      .single();

    if (!tenant) {
      console.error(`[Election Login API] Tenant not found or not verified: ${tenant_slug}`);
      return NextResponse.json({ error: 'Tenant not found or not verified' }, { status: 404 });
    }

    // 2. Resolve election
    const { data: election } = await supabase
      .from('election')
      .select('id, status')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 3. Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 4. Verify user exists in tenant_users for this tenant
    const { data: tenantUser } = await supabase
      .from('tenant users')
      .select('id, user_type')
      .eq('id', authData.user.id)
      .eq('tenantID', tenant.id)
      .single();

    if (!tenantUser) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'No account found for this organization' }, { status: 403 });
    }

    const allowedTypes = ['Voter', 'Candidate'];
    if (!allowedTypes.includes(tenantUser.user_type)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Unauthorized user type for this portal' }, { status: 403 });
    }

    // Optional: Check if voted
    // const { data: voteToken } = await supabase.from('vote_tokens').select('used').eq('user_id', tenantUser.id).single();

    return NextResponse.json({ success: true, session: authData.session });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
