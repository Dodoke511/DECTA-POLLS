import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/get_screening_config?electionId=X&phaseId=Y
 *
 * Returns in a single request:
 *  - rules:               all records from "phase rule" for this election where phaseType = 'filing'
 *  - approval:            the "approvals" record for this phase (or null)
 *  - ruleCheckableFields: form fields with rule_checkable = true for the election's filing form
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const phaseId = searchParams.get('phaseId');

    if (!electionId || !phaseId) {
      return NextResponse.json({ error: 'Missing electionId or phaseId.' }, { status: 400 });
    }

    // 1. Fetch phase rules (filing type) from "phase rule" table
    const { data: rules, error: rulesError } = await supabase
      .from('phase rule')
      .select('*')
      .eq('electionID', electionId)
      .eq('phaseType', 'filing')
      .order('priority', { ascending: false });

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 });
    }

    // 2. Fetch approval requirements from "approvals" table
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .select('*')
      .eq('phaseID', phaseId)
      .maybeSingle();

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 500 });
    }

    // 3. Fetch tenantID from the election record
    const { data: election } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    const tenantId = election?.tenantID ?? null;
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('electionID', electionId)
      .eq('phaseName', 'candidate_application')
      .maybeSingle();

    let ruleCheckableFields: any[] = [];
    if (form) {
      const { data: fields } = await supabase
        .from('form field')
        .select('id, fieldName, label, fieldType')
        .eq('formId', form.id)
        .eq('rule_checkable', true)
        .order('orderIndex', { ascending: true });

      ruleCheckableFields = fields ?? [];
    }

    return NextResponse.json({
      rules: rules ?? [],
      approval: approval ?? null,
      ruleCheckableFields,
      tenantId,
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
