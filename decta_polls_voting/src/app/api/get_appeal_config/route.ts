import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const phaseId = searchParams.get('phaseId');

    if (!electionId || !phaseId) {
      return NextResponse.json({ error: 'Missing electionId or phaseId.' }, { status: 400 });
    }

    // 1. Fetch Appeal Config
    const { data: config, error: configError } = await supabase
      .from('appeal config')
      .select('*')
      .eq('electionID', electionId)
      .eq('phaseID', phaseId)
      .maybeSingle();

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    // 2. Fetch Approval settings (reuses existing approvals table)
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .select('minimum_approvals')
      .eq('phaseID', phaseId)
      .maybeSingle();

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 500 });
    }

    // Mapping Database to API object format
    const appealConfig = config ? {
      whoCanAppeal: config.whoCanAppeal,
      maxAppeals: config.maxAppeals,
      onApproveAction: config.onApproveAction,
      onApproveStatus: config.onApproveStatus,
      onRejectAction: config.onRejectAction,
      onRejectStatus: config.onRejectStatus,
      visibility: config.visibility || [],
      showRejectionReason: config.showRejectionReason,
    } : null;

    return NextResponse.json({ 
      config: appealConfig,
      approval: approval || { minimum_approvals: 1 }
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
