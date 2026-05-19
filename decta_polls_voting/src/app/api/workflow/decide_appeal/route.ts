import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { appealId, decision } = await request.json();

    if (!appealId || !decision) {
      return NextResponse.json({ error: 'Missing appealId or decision' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get appeal info with election
    const { data: appeal, error: fetchError } = await supabase
      .from('appeals')
      .select('candidateID, electionID')
      .eq('id', appealId)
      .single();

    if (fetchError || !appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    // 2. Get election phases and appeal config
    const { data: phases } = await supabase
      .from('election_phases')
      .select('id, phase_type')
      .eq('electionID', appeal.electionID);

    const appealPhaseId = phases?.find((p: any) => p.phase_type === 'appeal')?.id;
    
    let appealConfig: any = null;
    if (appealPhaseId) {
      const { data: config } = await supabase
        .from('phase_config')
        .select('config')
        .eq('phaseID', appealPhaseId)
        .maybeSingle();
      
      if (config?.config) {
        try {
          appealConfig = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
        } catch (e) {
          console.error('Failed to parse appeal config:', e);
        }
      }
    }

    // 3. Update appeal status
    const status = decision === 'approved' ? 'approved' : 'rejected';
    const { error: updateError } = await supabase
      .from('appeals')
      .update({ status })
      .eq('id', appealId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Handle candidate status based on decision and config
    if (decision === 'approved') {
      // If appeal is approved, check config for intended action
      const onApproveAction = appealConfig?.onApproveAction || 'return_to_screening';
      
      if (onApproveAction === 'change_status') {
        // Approve the candidate immediately
        await supabase
          .from('candidate')
          .update({ status: 'APPROVED' })
          .eq('id', appeal.candidateID);
      } else if (onApproveAction === 'return_to_screening') {
        // Return to pending verification for admin to review again
        await supabase
          .from('candidate')
          .update({ status: 'PENDING_VERIFICATION' })
          .eq('id', appeal.candidateID);
      }
    } else if (decision === 'rejected') {
      // If appeal is rejected, check config for intended action
      const onRejectAction = appealConfig?.onRejectAction || 'keep_rejected';
      
      if (onRejectAction === 'lock_candidate') {
        // Lock the candidate permanently
        await supabase
          .from('candidate')
          .update({ status: 'DISQUALIFIED' })
          .eq('id', appeal.candidateID);
      }
      // Otherwise keep_rejected does nothing - candidate stays REJECTED
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
