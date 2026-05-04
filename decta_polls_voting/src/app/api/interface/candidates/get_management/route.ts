import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch candidates with their user info and election info
    const { data: candidates, error } = await supabase
      .from('candidate')
      .select(`
        id,
        status,
        filedDate,
        electionID,
        election:electionID ( title, slug ),
        user:userID ( id, first_name, surname, email )
      `)
      .eq('election:election.tenantID', tenantId) // Filter by tenant indirectly if needed, or join properly
      // Actually, candidate belongs to an election which belongs to a tenant.
      // But we can also filter by 'tenant users' since they belong to the tenant.
      
    // Re-fetching with explicit join logic to ensure accuracy for tenant filtering
    const { data: tenantCandidates, error: fetchError } = await supabase
      .from('candidate')
      .select(`
        id,
        status,
        filedDate,
        election:electionID!inner ( id, title, tenantID ),
        user:userID!inner ( id, first_name, surname, email )
      `)
      .eq('election.tenantID', tenantId)
      .order('filedDate', { ascending: false });

    if (fetchError) {
      console.error('Fetch Candidates Error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ candidates: tenantCandidates ?? [] });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
