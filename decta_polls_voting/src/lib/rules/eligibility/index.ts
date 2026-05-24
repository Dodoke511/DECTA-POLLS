import { createClient } from '@supabase/supabase-js';
import { EligibilityResult, RuleEvalResult } from '@/lib/types/screening';
import { evaluateCondition } from '@/lib/rules/evaluators';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface EvaluateParams {
  electionId: string;
  candidateId: string;
  tenantId: string;
  /** Array of { fieldId, value } pairs from the candidate's form submission */
  responseValues: { fieldId: string; value: string }[];
}

/**
 * Evaluates all active filing rules for an election against a candidate's response values.
 *
 * Tables used (actual Supabase names):
 *  - "phase rule"          — stores eligibility rules
 *  - "candidate rule flags" — stores evaluation results per candidate
 *
 * Columns follow camelCase convention matching the actual schema.
 */
export async function evaluateEligibility(params: EvaluateParams): Promise<EligibilityResult> {
  const { electionId, candidateId, tenantId, responseValues } = params;

  // Build a quick lookup map: fieldId → submitted value
  const valueMap = new Map<string, string>();
  for (const rv of responseValues) {
    valueMap.set(rv.fieldId, rv.value);
  }

  // 1. Fetch all active filing rules from "phase rule" table
  const { data: rules, error: rulesError } = await supabase
    .from('phase rule')
    .select('*')
    .eq('electionID', electionId)
    .eq('phaseType', 'filing')
    .eq('isActive', true)
    .order('priority', { ascending: false });

  if (rulesError) {
    console.error('[EligibilityEvaluator] Failed to fetch rules:', rulesError);
    // Fail open — don't block candidates if rules can't be fetched
    return { blocked: false, blockReasons: [], flags: [], all: [] };
  }

  if (!rules || rules.length === 0) {
    return { blocked: false, blockReasons: [], flags: [], all: [] };
  }

  // 2. Evaluate each rule
  const allResults: RuleEvalResult[] = [];
  const flagResults: RuleEvalResult[] = [];
  const blockReasons: string[] = [];
  let blocked = false;

  for (const rule of rules) {
    // conditionLogic column is JSONB with { fieldId, operator, value, ... }
    const logic = rule.conditionLogic;
    const submittedValue = valueMap.get(logic.fieldId) ?? null;

    // Rule "passes" when the condition IS met (candidate is eligible)
    // Rule "triggers" when the condition is NOT met → execute the action
    const conditionMet = evaluateCondition(logic.operator, submittedValue, logic.value);
    const ruleTriggered = !conditionMet;

    const result: RuleEvalResult = {
      ruleId: rule.id,
      label: rule.label,
      passed: !ruleTriggered,
      actionType: rule.actionType,   // camelCase column
      message: rule.message,         // "message" column (not error_message)
    };

    allResults.push(result);

    if (ruleTriggered) {
      if (rule.actionType === 'block') {
        blocked = true;
        blockReasons.push(rule.message);
      } else {
        flagResults.push(result);
      }
    }
  }

  // 3. Write results to "candidate rule flags" table
  if (allResults.length > 0) {
    const flagRecords = allResults.map(r => ({
      candidateID: candidateId,   // camelCase columns
      ruleID: r.ruleId,
      electionID: electionId,
      tenantID: tenantId,
      passed: r.passed,
      message: r.passed ? null : r.message,
      // evaluated_at is auto-set by DB default
    }));

    const { error: insertError } = await supabase
      .from('candidate rule flags')   // space-separated table name
      .insert(flagRecords);

    if (insertError) {
      // Non-fatal — log but don't fail the submission
      console.error('[EligibilityEvaluator] Failed to insert candidate rule flags:', insertError);
    }
  }

  return {
    blocked,
    blockReasons,
    flags: flagResults,
    all: allResults,
  };
}
