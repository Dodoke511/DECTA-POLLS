import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';
import { isPhaseActive } from '@/lib/public-election/phase-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    // Service role required because some tables (e.g., vote_tokens, ballot_sessions) might be locked down via RLS
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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
      .select('id, status')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 2. Validate Phase
    const { data: phases } = await supabaseClient
      .from('election phase')
      .select('*')
      .eq('electionID', election.id);

    if (!isPhaseActive(phases || [], 'voting')) {
      return NextResponse.json({ error: 'Voting is not active' }, { status: 403 });
    }

    // 3. Resolve User
    const userContext = await getElectionUserContext(supabaseClient, tenant.id, election.id);
    if (!userContext || !userContext.isVoter) {
      return NextResponse.json({ error: 'Unauthorized: Only registered voters can vote' }, { status: 401 });
    }

    // 4. Check if voter already submitted a ballot
    const { data: existingSession } = await supabaseAdmin
      .from('ballot_sessions')
      .select('id, status')
      .eq('election_id', election.id)
      .eq('voter_id', userContext.userId)
      .maybeSingle();

    if (existingSession) {
      if (existingSession.status === 'submitted') {
        return NextResponse.json({ error: 'You have already submitted a vote' }, { status: 400 });
      }
      // If active or flagged, we can return the same session ID
      return NextResponse.json({ sessionId: existingSession.id });
    }

    // 5. Get voter's vote token
    const { data: voteToken } = await supabaseAdmin
      .from('vote_tokens')
      .select('token_hash')
      .eq('election_id', election.id)
      .eq('voter_id', userContext.userId)
      .maybeSingle();

    if (!voteToken) {
      return NextResponse.json({ error: 'Vote token not found. You are not authorized for this election.' }, { status: 403 });
    }

    // 6. Create new ballot session
    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('ballot_sessions')
      .insert({
        election_id: election.id,
        voter_id: userContext.userId,
        token_hash: voteToken.token_hash,
        status: 'active'
      })
      .select('id')
      .single();

    if (insertError || !newSession) {
      console.error('Failed to create ballot session:', insertError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: newSession.id });

  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
