import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { triggerNotification } from '@/lib/server/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;
    const body = await request.json();
    const { sessionId, payloads } = body;

    if (!sessionId || !payloads || !Array.isArray(payloads)) {
      return NextResponse.json({ error: 'Invalid submission data' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. Verify Session & Get Token Hash
    const { data: session } = await supabaseAdmin
      .from('ballot_sessions')
      .select('status, token_hash, voter_id')
      .eq('id', sessionId)
      .eq('election_id', election.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Invalid ballot session' }, { status: 400 });
    }

    if (session.status === 'submitted') {
      return NextResponse.json({ error: 'Ballot already submitted' }, { status: 400 });
    }
    
    if (session.voter_id !== userContext.userId) {
       return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    // 5. Submit via Secure RPC
    // The RPC will handle checking if the token is already used and inserting all records within a transaction
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('submit_vote', {
      p_token_hash: session.token_hash,
      p_election_id: election.id,
      p_voter_id: userContext.userId,
      p_vote_payloads: payloads,
      p_session_id: sessionId
    });

    if (rpcError) {
      console.error('Submit vote RPC error:', rpcError);
      
      if (rpcError.message.includes('INVALID_TOKEN')) {
         return NextResponse.json({ error: 'Vote authorization token invalid' }, { status: 403 });
      }
      if (rpcError.message.includes('TOKEN_USED')) {
         return NextResponse.json({ error: 'You have already voted in this election' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Failed to process vote submission' }, { status: 500 });
    }

    // Trigger notification asynchronously
    triggerNotification('Vote Cast', tenant.id, election.id, {
      voterId: userContext.userId
    }).catch(err => console.error('[Vote Submit API] Notification trigger error:', err));

    return NextResponse.json({ success: true, message: 'Vote submitted successfully' });

  } catch (error) {
    console.error('Vote submission error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
