import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { appealId, decision } = await request.json();

    if (!appealId || !decision) {
      return NextResponse.json({ error: 'Missing appealId or decision' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Invalid decision value' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: appeal, error: fetchError } = await supabase
      .from('appeals')
      .select('candidateID, electionID')
      .eq('id', appealId)
      .maybeSingle();

    if (fetchError || !appeal) {
      return NextResponse.json({ error: fetchError?.message || 'Appeal not found' }, { status: 404 });
    }

    const { data: phases, error: phasesError } = await supabase
      .from('election phase')
      .select('id, phase_type')
      .eq('electionID', appeal.electionID);

    if (phasesError) {
      return NextResponse.json({ error: phasesError.message }, { status: 500 });
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
        return NextResponse.json({ error: configError.message }, { status: 500 });
      }

      if (config) {
        appealConfig = config;
      }
    }

    const status = decision === 'approved' ? 'approved' : 'rejected';
    const { error: appealUpdateError } = await supabase
      .from('appeals')
      .update({ status })
      .eq('id', appealId);

    if (appealUpdateError) {
      return NextResponse.json({ error: appealUpdateError.message }, { status: 500 });
    }

    if (decision === 'approved') {
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
    } else {
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
