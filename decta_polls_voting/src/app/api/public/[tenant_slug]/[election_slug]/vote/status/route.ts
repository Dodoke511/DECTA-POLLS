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

    // 2. Resolve User
    const userContext = await getElectionUserContext(supabaseClient, tenant.id, election.id);
    if (!userContext || !userContext.isVoter) {
       return NextResponse.json({ 
         status: 'unauthorized', 
         canVote: false 
       });
    }

    // 3. Check vote_tokens to see if they are authorized and/or have already voted
    const { data: voteToken } = await supabaseAdmin
      .from('vote_tokens')
      .select('used')
      .eq('election_id', election.id)
      .eq('voter_id', userContext.userId)
      .maybeSingle();

    if (!voteToken) {
      return NextResponse.json({ 
        status: 'not_authorized', 
        canVote: false,
        message: 'No vote token found for this election.' 
      });
    }

    if (voteToken.used) {
       return NextResponse.json({ 
         status: 'already_voted', 
         canVote: false,
         message: 'You have already cast your vote in this election.' 
       });
    }

    return NextResponse.json({ 
      status: 'eligible', 
      canVote: true 
    });

  } catch (error) {
    console.error('Vote status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
