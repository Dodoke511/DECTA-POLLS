import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Get tenantID from election
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    // Fetch tenant roles
    const { data: roles, error: rolesError } = await supabase
      .from('tenant_roles')
      .select('id, roleName')
      .eq('tenantID', election.tenantID);

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    return NextResponse.json({ roles: roles ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
