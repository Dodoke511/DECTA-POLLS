import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/save_screening_config
 *
 * Body: {
 *   electionId: string,
 *   phaseId:    string,     // election_phases.id
 *   tenantId:   string,
 *   rules:      PhaseRule[],
 *   approval:   { minApprovals: number } | null,
 * }
 *
 * Strategy:
 *  - Rules: delete all existing filing rules for this election, insert fresh set.
 *  - Approval: upsert on phaseID (unique constraint on "approvals" table).
 */
export async function POST(request: Request) {
  try {
    const { electionId, phaseId, rules, approval } = await request.json();

    if (!electionId || !phaseId) {
      return NextResponse.json({ error: 'Missing electionId or phaseId.' }, { status: 400 });
    }

    // Resolve tenantID server-side from the election record (same pattern as save_form)
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    const tenantId = election.tenantID;

    // ── 1. Save Phase Rules (replace strategy) ──────────────────────────────
    // Delete all existing filing rules for this election from "phase rule" table
    const { error: deleteError } = await supabase
      .from('phase rule')
      .delete()
      .eq('electionID', electionId)
      .eq('phaseType', 'filing');

    if (deleteError) {
      return NextResponse.json({ error: `Failed to clear old rules: ${deleteError.message}` }, { status: 500 });
    }

    if (Array.isArray(rules) && rules.length > 0) {
      const ruleRecords = rules.map((r: any, i: number) => ({
        electionID: electionId,
        tenantID: tenantId,
        phaseType: 'screening',
        label: r.label,
        conditionLogic: r.condition_logic,  // JSONB column
        actionType: r.action_type,
        message: r.error_message,           // column is named "message" in your DB
        priority: String(rules.length - i), // column is text in your DB
        isActive: r.is_active ?? true,
      }));

      const { error: insertRulesError } = await supabase
        .from('phase rule')
        .insert(ruleRecords);

      if (insertRulesError) {
        return NextResponse.json({ error: `Failed to save rules: ${insertRulesError.message}` }, { status: 500 });
      }
    }

    // ── 2. Save Approval Requirements ───────────────────────────────────────
    if (approval !== null && approval !== undefined) {
      const approvalRecord = {
        phaseID: phaseId,
        electionID: electionId,
        tenantID: tenantId,
        minimum_approvals: approval.minApprovals ?? 1, // column is minimum_approvals (snake_case)
        persist_until_appeals_end: approval.persistUntilAppealsEnd ?? false,
      };

      const { error: approvalError } = await supabase
        .from('approvals')
        .upsert(approvalRecord, { onConflict: 'phaseID' });

      if (approvalError) {
        return NextResponse.json({ error: `Failed to save approval config: ${approvalError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Screening config saved successfully.' }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
