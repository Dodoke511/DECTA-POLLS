import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';
import Papa from 'papaparse';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // 1. Resolve Tenant & Election
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single();

    if (!tenant) return new NextResponse('Tenant not found', { status: 404 });

    const { data: election } = await supabaseClient
      .from('election')
      .select('id, title')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return new NextResponse('Election not found', { status: 404 });

    // 2. Resolve Config
    const { data: config } = await supabaseClient
      .from('results_config')
      .select('*')
      .eq('election_id', election.id)
      .maybeSingle();

    if (!config || !config.published_at || !config.enable_results_download) {
       return new NextResponse('Export not available', { status: 403 });
    }

    // 3. Resolve User Access Gate for Download
    if (config.download_visibility === 'admin') {
      // Must be a tenant admin to download. We check if they are an admin via userContext
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return new NextResponse('Unauthorized', { status: 401 });
      
      const { data: tenantUser } = await supabaseClient
        .from('tenant users')
        .select('user_type')
        .eq('id', user.id)
        .eq('tenantID', tenant.id)
        .single();
        
      if (!tenantUser || !['admin', 'sub-admin'].includes(tenantUser.user_type?.toLowerCase())) {
         return new NextResponse('Unauthorized: Admin access required for download', { status: 403 });
      }
    } else if (config.download_visibility === 'voters') {
       const userContext = await getElectionUserContext(supabaseClient, tenant.id, election.id);
       if (!userContext?.isVoter) {
         return new NextResponse('Unauthorized: Voter access required', { status: 403 });
       }
    }

    // 4. Fetch Results Data
    const { data: results } = await supabaseClient
      .from('election_results')
      .select('position_id, candidate_id, vote_count, rank, is_winner, abstain_count')
      .eq('election_id', election.id)
      .order('rank', { ascending: true, nullsFirst: false });

    const { data: positions } = await supabaseClient
      .from('positions')
      .select('id, title')
      .eq('election_id', election.id);

    const { data: candidates } = await supabaseClient
      .from('candidate')
      .select('id, name, party_name')
      .eq('election_id', election.id);

    // 5. Build CSV Data
    const csvData: any[] = [];
    
    positions?.forEach(pos => {
      const positionResults = results?.filter(r => r.position_id === pos.id) || [];
      const sortedResults = positionResults.sort((a, b) => a.rank - b.rank);
      
      sortedResults.forEach((r, idx) => {
        const cand = candidates?.find(c => c.id === r.candidate_id);
        csvData.push({
          'Position': pos.title,
          'Candidate Name': cand?.name || 'Unknown',
          'Party': cand?.party_name || 'Independent',
          'Votes': r.vote_count,
          'Rank': r.rank,
          'Is Winner': r.is_winner ? 'Yes' : 'No',
          'Abstain Count (Position)': idx === 0 ? r.abstain_count : ''
        });
      });
    });

    const csv = Papa.unparse(csvData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${election_slug}-results.csv"`);

    return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('Results export error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
