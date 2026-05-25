import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

    // 2. Fetch Voting Config
    const { data: votingConfig } = await supabaseClient
      .from('voting_config')
      .select('*')
      .eq('election_id', election.id)
      .maybeSingle();

    // 3. Fetch Positions
    const { data: positions } = await supabaseClient
      .from('positions')
      .select('*')
      .eq('electionID', election.id)
      .order('id'); // Should order by some sequence if exists

    // 4. Fetch Candidates
    // Note: ensure candidates are only approved candidates!
    const { data: rawCandidates, error: candidateError } = await supabaseClient
      .from('candidate')
      .select(`
        id,
        electionID,
        userID,
        status,
        political_party,
        user:userID!inner ( id, first_name, surname )
      `)
      .eq('electionID', election.id)
      .ilike('status', 'approved');

    let candidates: any[] = [];
    if (rawCandidates && rawCandidates.length > 0) {
      // Fetch dynamic position assignments from forms
      const { data: forms } = await supabaseClient
        .from('forms')
        .select('id')
        .eq('electionID', election.id)
        .eq('phaseName', 'candidate_application')
        .maybeSingle();

      let values: any[] = [];
      let responses: any[] = [];
      if (forms) {
        const { data: positionFields } = await supabaseClient
          .from('form field')
          .select('id')
          .eq('formId', forms.id)
          .eq('fieldType', 'position_selector');
          
        if (positionFields && positionFields.length > 0) {
          const fieldIds = positionFields.map(f => f.id);
          const userIds = rawCandidates.map(c => c.userID);
          
          const { data: resp } = await supabaseClient
            .from('form response')
            .select('id, userID')
            .eq('formId', forms.id)
            .in('userID', userIds);
            
          if (resp && resp.length > 0) {
            responses = resp;
            const responseIds = responses.map(r => r.id);
            const { data: vals } = await supabaseClient
              .from('form response value')
              .select('responseID, fieldID, value')
              .in('responseID', responseIds)
              .in('fieldID', fieldIds);
            if (vals) values = vals;
          }
        }
      }

      candidates = rawCandidates.map(c => {
        const u = Array.isArray(c.user) ? c.user[0] : c.user;
        const name = `${u?.first_name || ''} ${u?.surname || ''}`.trim();
        
        let positionId = null;
        if (forms && responses.length > 0 && values.length > 0) {
          const userResponse = responses.find(r => r.userID === c.userID);
          if (userResponse) {
            const userValue = values.find(v => v.responseID === userResponse.id);
            if (userValue) {
               // The userValue.value is actually the Position Title (e.g. "President"), not the Position ID!
               // We need to look up the position ID from the positions array based on the title.
               const positionTitle = (userValue.value || '').toLowerCase().trim();
               const matchedPosition = (positions || []).find(p => (p.title || '').toLowerCase().trim() === positionTitle);
               if (matchedPosition) {
                 positionId = matchedPosition.id;
               }
            }
          }
        }
        
        return {
          id: c.id,
          name: name || 'Unknown Candidate',
          party_name: c.political_party || 'INDEPENDENT',
          photo_url: undefined, // Will be handled if we pull from file_upload fields later
          position_id: positionId ? Number(positionId) : null
        };
      });
    }

    // Filter out candidates without a resolved position
    candidates = candidates.filter(c => c.position_id != null);

    // 5. Fetch Ballots mapping (position -> ballot ID)
    const { data: ballots } = await supabaseClient
      .from('ballots')
      .select('id, position_id')
      .eq('election_id', election.id);

    return NextResponse.json({ 
      votingConfig: votingConfig || {},
      positions: positions || [],
      candidates: candidates,
      ballots: ballots || []
    });

  } catch (error) {
    console.error('Vote data error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
