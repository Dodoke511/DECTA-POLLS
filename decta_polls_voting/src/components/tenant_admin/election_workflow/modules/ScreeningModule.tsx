'use client';

import React, {
  useState, useEffect, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import {
  Plus, Trash2, Loader2, Shield, Users2, CheckSquare2,
  ChevronDown, ChevronUp, AlertTriangle, Info, ShieldAlert, Flag,
} from 'lucide-react';
import {
  PhaseRule, ApprovalRequirement, RuleCheckableField,
  ConditionLogic, Operator, OPERATOR_META,
} from '@/lib/types/screening';

// ── Internal state ───────────────────────────────────────────────────────────
interface LocalRule {
  _key: string;
  id?: string;
  label: string;
  condition_logic: ConditionLogic;
  action_type: 'flag' | 'block';
  error_message: string;
  is_active: boolean;
}

const genKey = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const makeBlankRule = (fields: RuleCheckableField[]): LocalRule => ({
  _key: genKey(),
  label: '',
  condition_logic: {
    fieldId: fields[0]?.id ?? '',
    fieldName: fields[0]?.label ?? '',
    fieldType: fields[0]?.fieldType ?? 'short_text',
    operator: 'eq',
    value: '',
  },
  action_type: 'flag',
  error_message: '',
  is_active: true,
});

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  icon: Icon, title, badge, accent = '#8B5CF6', children, defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  accent?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.015]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <span className="text-[13px] font-semibold text-white/80">{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-white/5">{children}</div>}
    </div>
  );
}

// ── Rule row ─────────────────────────────────────────────────────────────────
function RuleRow({
  rule, fields, onUpdate, onDelete,
}: {
  rule: LocalRule;
  fields: RuleCheckableField[];
  onUpdate: (key: string, u: Partial<LocalRule>) => void;
  onDelete: (key: string) => void;
}) {
  const base = 'bg-[#0D0A1A] border border-white/8 text-white/75 rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-[#8B5CF6]/50 w-full';

  const selectedField = fields.find(f => f.id === rule.condition_logic.fieldId);
  const availableOps = OPERATOR_META.filter(op =>
    op.forTypes.includes(selectedField?.fieldType ?? 'short_text')
  );
  const showValueInput = !['is_checked', 'is_unchecked'].includes(rule.condition_logic.operator);

  const updateLogic = (partial: Partial<ConditionLogic>) => {
    onUpdate(rule._key, {
      condition_logic: { ...rule.condition_logic, ...partial },
    });
  };

  const handleFieldChange = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    // Reset operator to first valid one for new field type
    const firstOp = OPERATOR_META.find(op => op.forTypes.includes(field.fieldType));
    onUpdate(rule._key, {
      condition_logic: {
        fieldId: field.id,
        fieldName: field.label,
        fieldType: field.fieldType,
        operator: (firstOp?.value ?? 'eq') as Operator,
        value: '',
      },
    });
  };

  return (
    <div className="rounded-xl border border-white/8 bg-[#1A1330]/60 p-4 space-y-3">
      {/* Rule Label */}
      <div>
        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
          Rule Label
        </label>
        <input
          value={rule.label}
          onChange={e => onUpdate(rule._key, { label: e.target.value })}
          placeholder="e.g. Minimum GPA Requirement"
          className={base}
        />
      </div>

      {/* Condition Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Field selector */}
        <div>
          <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
            Field
          </label>
          {fields.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-400/70">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              No rule-checkable fields
            </div>
          ) : (
            <select
              value={rule.condition_logic.fieldId}
              onChange={e => handleFieldChange(e.target.value)}
              className={`${base} appearance-none`}
            >
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Operator selector */}
        <div>
          <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
            Operator
          </label>
          <select
            value={rule.condition_logic.operator}
            onChange={e => updateLogic({ operator: e.target.value as Operator })}
            className={`${base} appearance-none`}
          >
            {availableOps.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* Value input */}
        {showValueInput && (
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
              Value
            </label>
            <input
              type={selectedField?.fieldType === 'number' ? 'number' : 'text'}
              value={String(rule.condition_logic.value ?? '')}
              onChange={e => updateLogic({ value: e.target.value })}
              placeholder="Threshold value"
              className={base}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      <div>
        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
          Error / Flag Message
        </label>
        <input
          value={rule.error_message}
          onChange={e => onUpdate(rule._key, { error_message: e.target.value })}
          placeholder="Message shown to screener or displayed to candidate"
          className={base}
        />
      </div>

      {/* Action type + Delete */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 rounded-lg overflow-hidden border border-white/10">
          {(['flag', 'block'] as const).map(action => (
            <button
              key={action}
              type="button"
              onClick={() => onUpdate(rule._key, { action_type: action })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold capitalize transition-all
                ${rule.action_type === action
                  ? action === 'block'
                    ? 'bg-red-500/20 text-red-400 border-r border-white/10'
                    : 'bg-amber-500/20 text-amber-400 border-r border-white/10'
                  : 'text-white/30 hover:text-white/55'}`}
            >
              {action === 'flag'
                ? <Flag className="w-3 h-3" />
                : <ShieldAlert className="w-3 h-3" />}
              {action}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onDelete(rule._key)}
          className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-red-400/80 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>

      {/* Action type hint */}
      <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] leading-snug
        ${rule.action_type === 'block'
          ? 'bg-red-500/5 border border-red-500/15 text-red-400/70'
          : 'bg-amber-500/5 border border-amber-500/15 text-amber-400/70'}`}>
        {rule.action_type === 'block'
          ? <><ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Candidate will be <strong className="font-semibold">blocked</strong> from submitting if this rule fails.</>
          : <><Flag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Submission proceeds but a <strong className="font-semibold">flag</strong> is raised for the screener.</>}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export const ScreeningModule = forwardRef(({
  electionId,
  phaseId,
}: {
  electionId: string;
  phaseId?: string;
}, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [rules, setRules] = useState<LocalRule[]>([]);
  const [ruleCheckableFields, setRuleCheckableFields] = useState<RuleCheckableField[]>([]);

  // Approval config state
  const [isMultiApprover, setIsMultiApprover] = useState(false);
  const [minApprovals, setMinApprovals] = useState(2);

  // Require all decided toggle (stored for future use)
  const [requireAllDecided, setRequireAllDecided] = useState(false);

  // ── Load config on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!electionId || !phaseId) return;

    fetch(`/api/get_screening_config?electionId=${electionId}&phaseId=${phaseId}`)
      .then(r => r.json())
      .then(({ rules: fetchedRules, approval, ruleCheckableFields: fetchedFields }) => {
        // Map DB records to local state
        if (Array.isArray(fetchedRules)) {
          setRules(fetchedRules.map((r: any) => ({
            _key: genKey(),
            id: r.id,
            label: r.label,
            condition_logic: r.conditionLogic,      // DB column: conditionLogic (JSONB)
            action_type: r.actionType,              // DB column: actionType
            error_message: r.message,               // DB column: message
            is_active: r.isActive ?? true,          // DB column: isActive
          })));
        }
        if (approval) {
          setIsMultiApprover(approval.minimum_approvals > 1);   // DB column: minimum_approvals
          setMinApprovals(approval.minimum_approvals ?? 1);
        }
        if (Array.isArray(fetchedFields)) {
          setRuleCheckableFields(fetchedFields.map((f: any) => ({
            id: f.id,
            fieldName: f.fieldName,
            label: f.label,
            fieldType: f.fieldType,
          })));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [electionId, phaseId]);

  // ── Expose save() to parent PhaseCard via ref ────────────────────────────
  useImperativeHandle(ref, () => ({
    save: async (): Promise<boolean> => {
      if (!phaseId) {
        console.warn('[ScreeningModule] Missing phaseId — skipping save.');
        return true; // Non-fatal skip
      }

      try {
        const res = await fetch('/api/save_screening_config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            electionId,
            phaseId,
            // tenantId is resolved server-side from electionId
            rules: rules.map(r => ({
              label: r.label,
              condition_logic: r.condition_logic,
              action_type: r.action_type,
              error_message: r.error_message,
              is_active: r.is_active,
            })),
            approval: {
              minApprovals: isMultiApprover ? minApprovals : 1,
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error('[ScreeningModule] Save failed:', err);
          return false;
        }

        return true;
      } catch (err) {
        console.error('[ScreeningModule] Save exception:', err);
        return false;
      }
    },
  }));

  // ── Rule CRUD ────────────────────────────────────────────────────────────
  const addRule = useCallback(() => {
    setRules(prev => [...prev, makeBlankRule(ruleCheckableFields)]);
  }, [ruleCheckableFields]);

  const updateRule = useCallback((key: string, updates: Partial<LocalRule>) => {
    setRules(prev => prev.map(r => r._key === key ? { ...r, ...updates } : r));
  }, []);

  const deleteRule = useCallback((key: string) => {
    setRules(prev => prev.filter(r => r._key !== key));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 text-white/28 text-[12px] mt-5 pt-5 border-t border-white/5">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading screening configuration...
      </div>
    );
  }

  return (
    <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-[#A78BFA]" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white/85">Screening Configuration</p>
          <p className="text-[11px] text-white/32">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} · {isMultiApprover ? `${minApprovals} approvals required` : 'Single approver'}
          </p>
        </div>
      </div>

      {/* ── Section A: Screening Criteria ── */}
      <Section
        icon={ShieldAlert}
        title="Screening Criteria"
        badge={rules.length > 0 ? `${rules.length} rule${rules.length !== 1 ? 's' : ''}` : undefined}
        accent="#8B5CF6"
      >
        {ruleCheckableFields.length === 0 && (
          <div className="flex items-start gap-3 p-3 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <Info className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-400/70 leading-relaxed">
              No rule-checkable fields found. In the <strong className="font-semibold text-amber-400">Filing</strong> phase, enable the <strong className="font-semibold text-amber-400">Rule Checkable</strong> toggle on any fields you want to use as rule criteria here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {rules.length === 0 && ruleCheckableFields.length > 0 && (
            <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-white/10 bg-white/2 text-white/28 text-[12px]">
              No rules yet — click + Add Rule to define eligibility criteria.
            </div>
          )}
          {rules.map(rule => (
            <RuleRow
              key={rule._key}
              rule={rule}
              fields={ruleCheckableFields}
              onUpdate={updateRule}
              onDelete={deleteRule}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addRule}
          disabled={ruleCheckableFields.length === 0}
          className="flex items-center gap-2 w-full justify-center py-3 mt-3 rounded-xl border border-dashed border-white/12 text-[12px] text-white/35 hover:text-white/65 hover:border-[#8B5CF6]/35 hover:bg-[#8B5CF6]/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Eligibility Rule
        </button>
      </Section>

      {/* ── Section B: Approval Configuration ── */}
      <Section icon={Users2} title="Approval Configuration" accent="#6648EB">
        <div className="space-y-4 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-white/75">Multi-Approver Mode</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Require multiple screeners to approve before advancing
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMultiApprover(v => !v)}
              className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
              style={{ background: isMultiApprover ? '#6648EB' : 'rgba(255,255,255,0.1)' }}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${isMultiApprover ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {isMultiApprover && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-2">
                Minimum Approvals Required
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={minApprovals}
                  onChange={e => setMinApprovals(Math.max(2, +e.target.value))}
                  className="w-28 bg-[#0D0A1A] border border-white/8 text-white/75 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-center focus:outline-none focus:border-[#6648EB]/50"
                />
                <p className="text-[12px] text-white/35">
                  screeners must approve before a candidate advances
                </p>
              </div>
            </div>
          )}

          {!isMultiApprover && (
            <div className="px-4 py-3 rounded-xl border border-white/8 bg-white/2 text-[12px] text-white/40">
              A single screener's approval is sufficient to advance a candidate.
            </div>
          )}
        </div>
      </Section>

      {/* ── Section C: Require All Decided ── */}
      <Section icon={CheckSquare2} title="Require All Decided" accent="#10B981" defaultOpen={false}>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[13px] font-medium text-white/75">Require all candidates to have a decision</p>
            <p className="text-[11px] text-white/35 mt-0.5">
              Prevents the election from advancing until every candidate has been approved or rejected
            </p>
            <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> This setting is saved and will be enforced in a future update.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRequireAllDecided(v => !v)}
            className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ml-4"
            style={{ background: requireAllDecided ? '#10B981' : 'rgba(255,255,255,0.1)' }}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${requireAllDecided ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </Section>
    </div>
  );
});

ScreeningModule.displayName = 'ScreeningModule';
