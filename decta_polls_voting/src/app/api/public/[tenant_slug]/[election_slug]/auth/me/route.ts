import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Internal server error';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  const { tenant_slug, election_slug } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .eq('isVerified', true)
      .single();

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // 2. Resolve election
    const { data: election } = await supabase
      .from('election')
      .select('id')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 3. Get User Context
    const userContext = await getElectionUserContext(supabase, tenant.id, election.id);

    return NextResponse.json({ userContext });

  } catch (error: unknown) {
    console.error('Me route error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
