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
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Resolve Tenant & Election
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single();

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const { data: election } = await supabaseAdmin
      .from('election')
      .select('id')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 2. Resolve Config
    const { data: config } = await supabaseAdmin
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
    const { data: results } = await supabaseAdmin
      .from('election_results')
      .select('*')
      .eq('election_id', election.id)
      .order('rank', { ascending: true, nullsFirst: false });

    const { data: positions } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('electionID', election.id)
      .order('id');

    // Fetch approved candidates in the election
    const { data: rawCandidates } = await supabaseAdmin
      .from('candidate')
      .select(`
        id,
        userID,
        status,
        user:userID!inner ( id, first_name, surname )
      `)
      .eq('electionID', election.id)
      .ilike('status', 'approved');

    // Fetch form structure to locate photo upload fields
    const { data: form } = await supabaseAdmin
      .from('forms')
      .select('id')
      .eq('electionID', election.id)
      .eq('phaseName', 'candidate_application')
      .maybeSingle();

    let values: any[] = [];
    let fileFieldIds: string[] = [];
    let responses: any[] = [];
    if (form && rawCandidates && rawCandidates.length > 0) {
      const { data: fileFields } = await supabaseAdmin
        .from('form field')
        .select('id')
        .eq('formId', form.id)
        .eq('fieldType', 'file_upload');

      if (fileFields && fileFields.length > 0) {
        fileFieldIds = fileFields.map(f => f.id);
        const userIds = rawCandidates.map(c => c.userID);

        const { data: resp } = await supabaseAdmin
          .from('form response')
          .select('id, userID')
          .eq('formId', form.id)
          .in('userID', userIds);

        if (resp && resp.length > 0) {
          responses = resp;
          const responseIds = responses.map(r => r.id);
          const { data: vals } = await supabaseAdmin
            .from('form response value')
            .select('responseID, fieldID, value')
            .in('responseID', responseIds)
            .in('fieldID', fileFieldIds);
          if (vals) values = vals;
        }
      }
    }

    const isImageUrl = (value: string) =>
      /^(https?:\/\/|\/)/i.test(value) && /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(value);

    // Map response ID to user ID for quick candidate image lookup
    const candidatePhotos = new Map<string, string>();
    if (form && responses.length > 0 && values.length > 0) {
       const responseToUser = new Map(responses.map(r => [r.id, r.userID]));
       for (const val of values) {
          const uId = responseToUser.get(val.responseID);
          if (uId && val.value && isImageUrl(val.value)) {
             if (!candidatePhotos.has(uId)) {
                candidatePhotos.set(uId, val.value);
             }
          }
       }
    }

    const candidates = (rawCandidates || []).map(c => {
      const u = Array.isArray(c.user) ? c.user[0] : c.user;
      const name = `${u?.first_name || ''} ${u?.surname || ''}`.trim() || 'Candidate';
      const photoUrl = candidatePhotos.get(c.userID) || null;
      return {
        id: c.id,
        name,
        party_name: undefined,
        photo_url: photoUrl
      };
    });

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
    const { count: totalVoters } = await supabaseAdmin
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
