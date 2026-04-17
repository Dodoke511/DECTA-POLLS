import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId, phaseId, appealConfig, approval } = await request.json();

    if (!electionId || !phaseId) {
      return NextResponse.json({ error: 'Missing electionId or phaseId.' }, { status: 400 });
    }

    // Resolve tenantID server-side
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    const tenantId = election.tenantID;

    // ── 1. Save Appeal Config ──────────────────────────────
    if (appealConfig) {
      const configRecord = {
        phaseID: phaseId,
        electionID: electionId,
        tenantID: tenantId,
        whoCanAppeal: appealConfig.whoCanAppeal,
        maxAppeals: appealConfig.maxAppeals,
        onApproveAction: appealConfig.onApproveAction,
        onApproveStatus: appealConfig.onApproveStatus,
        onRejectAction: appealConfig.onRejectAction,
        onRejectStatus: appealConfig.onRejectStatus,
        visibility: appealConfig.visibility,
        showRejectionReason: appealConfig.showRejectionReason,
        allowWithdrawal: appealConfig.allowWithdrawal ?? false,
        updated_at: new Date().toISOString()
      };

      const { error: configError } = await supabase
        .from('appeal config')
        .upsert(configRecord, { onConflict: 'phaseID' });

      if (configError) {
        return NextResponse.json({ error: `Failed to save appeal config: ${configError.message}` }, { status: 500 });
      }
    }

    // ── 2. Save Approval Requirements ──────────────────────
    if (approval) {
      const approvalRecord = {
        phaseID: phaseId,
        electionID: electionId,
        tenantID: tenantId,
        minimum_approvals: approval.minApprovals ?? 1,
      };

      const { error: approvalError } = await supabase
        .from('approvals')
        .upsert(approvalRecord, { onConflict: 'phaseID' });

      if (approvalError) {
        return NextResponse.json({ error: `Failed to save approval config: ${approvalError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Appeal config saved successfully.' }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
