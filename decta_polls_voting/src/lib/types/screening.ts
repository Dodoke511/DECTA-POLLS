// Screening Phase — shared types for the rules engine and configuration UI

// ── Operators ────────────────────────────────────────────────────────────────
export type Operator =
  | 'eq'           // equals
  | 'neq'          // not equals
  | 'gt'           // greater than (numeric)
  | 'gte'          // greater than or equal (numeric)
  | 'lt'           // less than (numeric)
  | 'lte'          // less than or equal (numeric)
  | 'contains'     // string contains
  | 'not_contains' // string does not contain
  | 'is_checked'   // checkbox is true
  | 'is_unchecked'; // checkbox is false

export const OPERATOR_META: { value: Operator; label: string; forTypes: string[] }[] = [
  { value: 'eq',           label: '= Equals',            forTypes: ['short_text', 'number', 'dropdown', 'radio', 'email'] },
  { value: 'neq',          label: '≠ Not Equals',        forTypes: ['short_text', 'number', 'dropdown', 'radio', 'email'] },
  { value: 'gt',           label: '> Greater Than',      forTypes: ['number'] },
  { value: 'gte',          label: '≥ At Least',          forTypes: ['number'] },
  { value: 'lt',           label: '< Less Than',         forTypes: ['number'] },
  { value: 'lte',          label: '≤ At Most',           forTypes: ['number'] },
  { value: 'contains',     label: '⊃ Contains',          forTypes: ['short_text', 'email'] },
  { value: 'not_contains', label: '⊄ Does Not Contain',  forTypes: ['short_text', 'email'] },
  { value: 'is_checked',   label: '☑ Is Checked',        forTypes: ['checkbox'] },
  { value: 'is_unchecked', label: '☐ Is Unchecked',      forTypes: ['checkbox'] },
];

// ── Condition Logic ───────────────────────────────────────────────────────────
export interface ConditionLogic {
  fieldId: string;      // ID of the form_field being evaluated
  fieldName: string;    // Human label for display (from form_field.label)
  fieldType: string;    // FieldType — determines which operators are shown
  operator: Operator;
  value: string | number | boolean | null; // The threshold value
}

// ── Phase Rule (maps to phase_rules table) ────────────────────────────────────
export interface PhaseRule {
  id?: string;
  election_id: string;
  tenant_id: string;
  phase_type: 'filing' | 'voting' | 'transition' | 'results';
  label: string;                  // e.g. "Minimum GPA Requirement"
  condition_logic: ConditionLogic;
  action_type: 'flag' | 'block';
  error_message: string;
  priority: number;
  is_active: boolean;
}

// ── Approval Requirement (maps to approval_requirements table) ────────────────
export interface ApprovalRequirement {
  id?: string;
  phase_id: string;    // FK to election_phases.id
  election_id: string;
  tenant_id: string;
  min_approvals: number;
}

// ── Rules Engine Result ───────────────────────────────────────────────────────
export interface RuleEvalResult {
  ruleId: string;
  label: string;
  passed: boolean;
  actionType: 'flag' | 'block';
  message: string;
}

export interface EligibilityResult {
  blocked: boolean;
  blockReasons: string[];
  flags: RuleEvalResult[];  // flag-type rules that failed
  all: RuleEvalResult[];    // all evaluated rules
}

// ── Screening Config (combined shape returned by get_screening_config) ────────
export interface RuleCheckableField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
}

export interface ScreeningConfig {
  rules: PhaseRule[];
  approval: ApprovalRequirement | null;
  ruleCheckableFields: RuleCheckableField[];
}
