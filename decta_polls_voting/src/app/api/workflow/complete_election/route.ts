import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId, finalStatus } = await request.json();

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }
    
    if (finalStatus !== 'COMPLETED' && finalStatus !== 'FAILED') {
      return NextResponse.json({ error: 'Invalid finalStatus. Must be COMPLETED or FAILED.' }, { status: 400 });
    }

    // 1. If COMPLETED, we must tabulate the results first
    if (finalStatus === 'COMPLETED') {
      const { data: electionInfo, error: electionInfoError } = await supabase
        .from('election')
        .select('tenantID')
        .eq('id', electionId)
        .single();
        
      if (electionInfo && !electionInfoError) {
        const { error: rpcError } = await supabase.rpc('compute_election_results', {
          p_election_id: electionId,
          p_tenant_id: electionInfo.tenantID
        });
        if (rpcError) {
          console.error('Failed to compute results on completion:', rpcError);
        }

        // Make sure it's marked as published for the public site
        const { error: publishError } = await supabase
          .from('results_config')
          .update({ published_at: new Date().toISOString() })
          .eq('election_id', electionId);
        
        if (publishError) {
          console.error('Failed to update published_at:', publishError);
        }
      }
    }

    // 2. Update the election status
    const { error: electionError } = await supabase
      .from('election')
      .update({ status: finalStatus })
      .eq('id', electionId);

    if (electionError) {
      throw new Error(`Failed to update election status: ${electionError.message}`);
    }

    // 2. Find all candidates for this election who are APPROVED
    const { data: candidates, error: candidateError } = await supabase
      .from('candidate')
      .select('userID')
      .eq('electionID', electionId)
      .eq('status', 'APPROVED');

    if (candidateError) {
      console.error('Failed to fetch candidates for downgrading:', candidateError);
    } else if (candidates && candidates.length > 0) {
      const userIds = candidates.map(c => c.userID);
      
      // 3. Update those users back to Voter
      // Note: We use in() to update multiple rows at once
      const { error: updateError } = await supabase
        .from('tenant users')
        .update({ user_type: 'Voter' })
        .in('id', userIds);
        
      if (updateError) {
        console.error('Failed to downgrade candidates:', updateError);
      }
    }

    return NextResponse.json({ message: `Election successfully marked as ${finalStatus}.` }, { status: 200 });

  } catch (err: any) {
    console.error('Election Completion Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
