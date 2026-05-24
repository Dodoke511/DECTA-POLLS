import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';

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

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const { data: election } = await supabaseClient
      .from('election')
      .select('id')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 2. Resolve Config
    const { data: config } = await supabaseClient
      .from('results_config')
      .select('*')
      .eq('election_id', election.id)
      .maybeSingle();

    if (!config || !config.published_at) {
       return NextResponse.json({ status: 'not_published' }, { status: 403 });
    }

    // 3. Resolve User Access Gate
    if (config.results_visibility !== 'public') {
      const userContext = await getElectionUserContext(supabaseClient, tenant.id, election.id);
      
      if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized: Authentication required to view results.' }, { status: 401 });
      }

      if (config.results_visibility === 'voters' && !userContext.isVoter) {
        // Only voters can view
        // But if they are candidate and candidate_can_view_results is true, maybe allow?
        // Let's rely on the outer layout/page gate for candidate explicit blocking, but here we enforce strictly.
        if (userContext.isCandidate && config.candidate_can_view_results) {
          // Allow
        } else {
           return NextResponse.json({ error: 'Unauthorized: Only voters can view these results.' }, { status: 403 });
        }
      }
    }

    // 4. Fetch Results Data
    const { data: results } = await supabaseClient
      .from('election_results')
      .select('*')
      .eq('election_id', election.id)
      .order('rank', { ascending: true, nullsFirst: false });

    const { data: positions } = await supabaseClient
      .from('positions')
      .select('*')
      .eq('election_id', election.id)
      .order('id');

    const { data: candidates } = await supabaseClient
      .from('candidate')
      .select('id, name, party_name, photo_url, position_id')
      .eq('election_id', election.id);

    // Calculate basic stats
    let totalVotes = 0;
    // We can estimate total votes cast by getting distinct ballot submissions, or summing max position votes
    // The exact total turnout might be stored or we calculate from max votes cast in any position
    const positionTotals: Record<string, number> = {};
    results?.forEach((r: any) => {
       positionTotals[r.position_id] = (positionTotals[r.position_id] || 0) + r.vote_count;
       // Add abstain once per position
       if (!positionTotals[r.position_id + '_abstain'] && r.abstain_count > 0) {
           positionTotals[r.position_id] += r.abstain_count;
           positionTotals[r.position_id + '_abstain'] = 1;
       }
    });
    
    totalVotes = Math.max(0, ...Object.values(positionTotals).filter(v => typeof v === 'number'));
    
    // For a real app, turnout % needs total registered voters
    // Here we'll just mock 100% or something if we don't know total voters
    const { count: totalVoters } = await supabaseClient
      .from('tenant users')
      .select('id', { count: 'exact', head: true })
      .eq('tenantID', tenant.id)
      .eq('user_type', 'voter');

    const turnoutPercentage = totalVoters ? Math.round((totalVotes / totalVoters) * 1000) / 10 : 0;

    return NextResponse.json({ 
      status: 'published',
      config,
      positions: positions || [],
      candidates: candidates || [],
      results: results || [],
      stats: {
        totalVotes,
        turnoutPercentage
      }
    });

  } catch (error) {
    console.error('Results fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
