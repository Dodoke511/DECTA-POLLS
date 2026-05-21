import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function serializeError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.msg || err.details || JSON.stringify(err) || 'Unknown error';
}

export async function POST(request: Request) {
  try {
    const { appealId, decision, reason, decidedBy } = await request.json();

    if (!appealId || !decision) {
      return NextResponse.json({ error: 'Missing appealId or decision' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Invalid decision value' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: appeal, error: fetchError } = await supabase
      .from('appeals')
      .select('candidateID, electionID')
      .eq('id', appealId)
      .maybeSingle();

    if (fetchError || !appeal) {
      console.error('[decide_appeal] Fetch appeal error:', fetchError);
      return NextResponse.json({ error: serializeError(fetchError) || 'Appeal not found' }, { status: 404 });
    }

    const { data: phases, error: phasesError } = await supabase
      .from('election phase')
      .select('id, phase_type')
      .eq('electionID', appeal.electionID);

    if (phasesError) {
      console.error('[decide_appeal] Fetch phases error:', phasesError);
      return NextResponse.json({ error: serializeError(phasesError) }, { status: 500 });
    }

    const appealPhaseId = phases?.find((phase: any) => phase.phase_type === 'appeal')?.id;
    let appealConfig: any = null;

    if (appealPhaseId) {
      const { data: config, error: configError } = await supabase
        .from('appeal config')
        .select('onApproveAction, onApproveStatus, onRejectAction, onRejectStatus')
        .eq('phaseID', appealPhaseId)
        .maybeSingle();

      if (configError) {
        console.error('[decide_appeal] Fetch appeal config error:', configError);
        return NextResponse.json({ error: serializeError(configError) }, { status: 500 });
      }

      if (config) {
        appealConfig = config;
      }
    }

    // 1. Insert into appeal decisions
    const { error: insertError } = await supabase
      .from('appeal decisions')
      .insert({
        appealID: appealId,
        decidedBy: decidedBy || null,
        decision: decision,
        reason: reason || ''
      });

    if (insertError) {
      console.error('[decide_appeal] Insert appeal decision error:', JSON.stringify(insertError));
      return NextResponse.json({ error: serializeError(insertError) }, { status: 500 });
    }

    // 2. Fetch required minimum_approvals for Multi-Approver mode
    let minApprovals = 1;
    if (appealPhaseId) {
      const { data: approvalRecord } = await supabase
        .from('approvals')
        .select('minimum_approvals')
        .eq('phaseID', appealPhaseId)
        .maybeSingle();
      if (approvalRecord?.minimum_approvals) {
        minApprovals = approvalRecord.minimum_approvals;
      }
    }

    // 3. Count total decisions
    const { data: allDecisions, error: countError } = await supabase
      .from('appeal decisions')
      .select('decision')
      .eq('appealID', appealId);

    if (countError) {
      console.error('[decide_appeal] Count decisions error:', JSON.stringify(countError));
      return NextResponse.json({ error: serializeError(countError) }, { status: 500 });
    }

    const approvedCount = allDecisions?.filter(d => d.decision === 'approved').length || 0;
    const rejectedCount = allDecisions?.filter(d => d.decision === 'rejected').length || 0;

    let finalStatus = 'pending';

    // 4. Evaluate Thresholds
    if (decision === 'approved' && approvedCount >= minApprovals) {
      finalStatus = 'approved';
      
      // Update Appeal Status
      await supabase.from('appeals').update({ status: 'approved' }).eq('id', appealId);

      // Execute Outcome Actions
      const onApproveAction = appealConfig?.onApproveAction || 'return_to_screening';
      const onApproveStatus = appealConfig?.onApproveStatus || 'APPROVED';

      if (onApproveAction === 'change_status') {
        await supabase
          .from('candidate')
          .update({ status: onApproveStatus })
          .eq('id', appeal.candidateID);
      } else {
        await supabase
          .from('candidate')
          .update({ status: 'PENDING_VERIFICATION' })
          .eq('id', appeal.candidateID);
        await supabase.rpc('increment_candidate_edits_after_appeal', { candidate_id: appeal.candidateID });
      }
    } else if (decision === 'rejected' && rejectedCount >= minApprovals) {
      finalStatus = 'rejected';

      // Update Appeal Status
      await supabase.from('appeals').update({ status: 'rejected' }).eq('id', appealId);

      // Execute Outcome Actions
      const onRejectAction = appealConfig?.onRejectAction || 'keep_rejected';
      const onRejectStatus = appealConfig?.onRejectStatus || 'REJECTED';

      if (onRejectAction === 'lock_candidate') {
        await supabase
          .from('candidate')
          .update({ status: 'DISQUALIFIED' })
          .eq('id', appeal.candidateID);
      } else {
        await supabase
          .from('candidate')
          .update({ status: onRejectStatus })
          .eq('id', appeal.candidateID);
      }
    }

    return NextResponse.json({ success: true, finalStatus });
  } catch (err: any) {
    console.error('[decide_appeal] Unhandled exception:', err);
    return NextResponse.json({ error: serializeError(err) || 'Internal Server Error' }, { status: 500 });
  }
}
