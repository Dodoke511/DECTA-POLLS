import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch appeals join with candidate and tenant users
    // Note: We're using service role to bypass RLS for management APIs
    const { data: appeals, error } = await supabase
      .from('appeals')
      .select(`
        id,
        status,
        submittedAt,
        formResponseID,
        candidateID,
        candidate:candidateID (
          id,
          user:userID (
            id,
            first_name,
            surname,
            email
          )
        )
      `)
      .eq('electionID', electionId)
      .order('submittedAt', { ascending: false });

    if (error) {
      console.error('Fetch Appeals Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch form response values for each appeal so we can show real appeal details.
    const formResponseIds = (appeals || [])
      .map((a: any) => a.formResponseID)
      .filter((id: any) => id);

    let responseValues: any[] = [];
    if (formResponseIds.length > 0) {
      const { data, error: valuesError } = await supabase
        .from('form response value')
        .select('responseID, fieldID, value')
        .in('responseID', formResponseIds);

      if (valuesError) {
        console.error('Fetch Appeal Response Values Error:', valuesError);
        return NextResponse.json({ error: valuesError.message }, { status: 500 });
      }

      responseValues = data || [];
    }

    const fieldIds = Array.from(new Set(responseValues.map((v: any) => v.fieldID)));
    let fields: any[] = [];
    if (fieldIds.length > 0) {
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form field')
        .select('id, label')
        .in('id', fieldIds);

      if (fieldsError) {
        console.error('Fetch Appeal Form Fields Error:', fieldsError);
        return NextResponse.json({ error: fieldsError.message }, { status: 500 });
      }

      fields = fieldsData || [];
    }

    const fieldLabelById = new Map((fields || []).map((field: any) => [field.id, field.label || 'Field']));
    const valuesByResponseId = new Map<string, Array<{ fieldID: string; value: string }>>();

    (responseValues || []).forEach((value: any) => {
      const list = valuesByResponseId.get(value.responseID) || [];
      list.push({ fieldID: value.fieldID, value: value.value });
      valuesByResponseId.set(value.responseID, list);
    });

    // --- New Logic: Fetch decision counts and threshold ---
    
    // Get the appeal phase ID
    const { data: phases } = await supabase
      .from('election phase')
      .select('id, phase_type')
      .eq('electionID', electionId);
    
    const appealPhaseId = phases?.find((p: any) => p.phase_type === 'appeal')?.id;
    
    // Get the minimum_approvals threshold
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

    // Get all appeal decisions for these appeals
    const appealIds = (appeals || []).map((a: any) => a.id);
    let decisionsData: any[] = [];
    if (appealIds.length > 0) {
      const { data: decisions } = await supabase
        .from('appeal decisions')
        .select('appealID, decision')
        .in('appealID', appealIds);
      decisionsData = decisions || [];
    }

    const decisionsByAppealId = new Map<string, any[]>();
    decisionsData.forEach((d: any) => {
      const list = decisionsByAppealId.get(d.appealID) || [];
      list.push(d);
      decisionsByAppealId.set(d.appealID, list);
    });

    const mappedAppeals = (appeals || []).map((a: any) => {
      const details = (valuesByResponseId.get(a.formResponseID) || []).map((value) => ({
        label: fieldLabelById.get(value.fieldID) || 'Field',
        value: value.value,
      }));

      const reason = details.length > 0
        ? details.map((item) => `${item.label}: ${item.value}`).join(' • ')
        : "Please check form response values for detailed reason.";

      const decisions = decisionsByAppealId.get(a.id) || [];
      const approvedCount = decisions.filter(d => d.decision === 'approved').length;
      const rejectedCount = decisions.filter(d => d.decision === 'rejected').length;

      return {
        id: a.id,
        candidateId: a.candidateID,
        candidateName: `${a.candidate?.user?.first_name} ${a.candidate?.user?.surname}`,
        candidateEmail: a.candidate?.user?.email,
        status: a.status,
        createdAt: a.submittedAt,
        reason,
        details,
        approvedCount,
        rejectedCount,
        threshold: minApprovals,
      };
    });

    return NextResponse.json({ appeals: mappedAppeals });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
