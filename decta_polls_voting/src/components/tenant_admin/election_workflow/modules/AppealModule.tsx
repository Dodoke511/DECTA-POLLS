'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Loader2, Settings, Users2, ShieldAlert, ArrowRight, BookOpen, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import { DynamicFormBuilder } from './CandidateFormBuilder';

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
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-white/5">{children}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const AppealModule = forwardRef(({
  electionId,
  phaseId,
  subscription = 'BASIC',
  runtimeStatus,
}: {
  electionId: string,
  phaseId?: string,
  subscription?: 'BASIC' | 'STANDARD' | 'ENTERPRISE',
  runtimeStatus?: string,
}, ref) => {
  const [isLoading, setIsLoading] = useState(true);

  // Configuration State
  const [whoCanAppeal, setWhoCanAppeal] = useState<'rejected_only' | 'approved_only' | 'all'>('rejected_only');
  const [maxAppeals, setMaxAppeals] = useState<number>(1);
  const [onApproveAction, setOnApproveAction] = useState<string>('change_status');
  const [onRejectAction, setOnRejectAction] = useState<string>('keep_rejected');
  const [visibility, setVisibility] = useState<string[]>(['candidate', 'reviewers']);
  const [showRejectionReason, setShowRejectionReason] = useState<boolean>(true);
  const [allowWithdrawal, setAllowWithdrawal] = useState<boolean>(false);

  // Approval State
  const [isMultiApprover, setIsMultiApprover] = useState(false);
  const [minApprovals, setMinApprovals] = useState(2);

  const formRef = useRef<{ save: () => Promise<boolean> }>(null);

  useEffect(() => {
    if (!electionId || !phaseId) return;

    fetch(`/api/get_appeal_config?electionId=${electionId}&phaseId=${phaseId}`)
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setWhoCanAppeal(data.config.whoCanAppeal || 'rejected_only');
          setMaxAppeals(data.config.maxAppeals || 1);
          setOnApproveAction(data.config.onApproveAction || 'change_status');
          setOnRejectAction(data.config.onRejectAction || 'keep_rejected');
          setVisibility(data.config.visibility || ['candidate', 'reviewers']);
          setShowRejectionReason(data.config.showRejectionReason ?? true);
          setAllowWithdrawal(data.config.allowWithdrawal ?? false);
        }
        if (data.approval) {
          const min = data.approval.minimum_approvals || 1;
          setIsMultiApprover(min > 1);
          setMinApprovals(Math.max(2, min));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [electionId, phaseId]);

  // Expose save method
  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        // 1. Save Form Fields first
        if (formRef.current) {
          const formSaved = await formRef.current.save();
          if (!formSaved) throw new Error('Form fields failed to save.');
        }

        // 2. Save Phase Config
        if (!phaseId) return true;

        const res = await fetch('/api/save_appeal_config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            electionId,
            phaseId,
            appealConfig: {
              whoCanAppeal,
              maxAppeals,
              onApproveAction,
              onApproveStatus: 'approved',
              onRejectAction,
              onRejectStatus: 'rejected',
              visibility,
              showRejectionReason,
              allowWithdrawal,
            },
            approval: {
              minApprovals: isMultiApprover ? minApprovals : 1,
            }
          }),
        });

        if (!res.ok) throw new Error('Failed to save appeal config');
        return true;
      } catch (err) {
        console.error('Save failed:', err);
        return false;
      }
    }
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-[12px] text-white/40">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading Appeal Module...
      </div>
    );
  }

  const toggleVisibility = (val: string) => {
    setVisibility(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  return (
    <div className="mt-5 pt-5 border-t border-white/5 space-y-4">
      {/* ── Section 1: Appeal Submission Form ── */}
      <div className="px-5 py-2 -mx-5 bg-gradient-to-r from-[#A78BFA]/5 to-transparent border-y border-[#A78BFA]/10">
        <DynamicFormBuilder
          ref={formRef}
          electionId={electionId}
          toolName="appeal_submission"
          title="Appeal Submission Form"
          features={{ showRuleCheckable: false }}
          disableDelete={runtimeStatus === 'active' || runtimeStatus === 'completed'}
          disableAdd={runtimeStatus === 'completed'}
        />
      </div>

      {/* ── Section 2: Appeal Eligibility Rules ── */}
      <Section icon={BookOpen} title="Appeal Eligibility Rules" accent="#EAB308">
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-2">
              Who can appeal?
            </label>
            <div className="flex gap-2.5">
              {(['rejected_only', 'approved_only', 'all'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWhoCanAppeal(opt)}
                  className={`flex-1 py-2 rounded-xl border text-[12px] font-medium transition-all ${whoCanAppeal === opt ? 'border-[#EAB308] bg-[#EAB308]/10 text-white' : 'border-white/10 bg-[#0D0A1A] text-white/40 hover:text-white/60'}`}
                >
                  {opt === 'rejected_only' ? 'Rejected Candidates' : opt === 'approved_only' ? 'Approved Candidates' : 'All Candidates'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-2">
              Max Appeals Per Candidate
            </label>
            <div className="flex items-center gap-3">
              <div className="flex bg-[#0D0A1A] border border-white/10 rounded-xl overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setMaxAppeals(1)}
                  className={`px-4 py-2 text-[12px] font-medium transition-all ${maxAppeals === 1 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  One Only
                </button>
                <button
                  type="button"
                  onClick={() => setMaxAppeals(3)}
                  className={`px-4 py-2 text-[12px] font-medium transition-all border-l border-white/10 ${maxAppeals > 1 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  Multiple Allowed
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-white/40">Custom:</label>
                <input
                  type="number"
                  min={1}
                  value={maxAppeals}
                  onChange={e => setMaxAppeals(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 bg-[#0D0A1A] border border-white/10 rounded-xl px-3 py-2 text-white/80 text-sm text-center"
                />
              </div>
            </div>
            <p className="text-xs text-white/40 mt-2">Set the maximum number of appeals a single candidate may submit for this election.</p>
          </div>
        </div>
      </Section>

      {/* ── Section 3: Appeal Review Assignment (Approval logic) ── */}
      <Section icon={Users2} title="Appeal Decision Mode" accent="#EC4899">
        <div className="space-y-4 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-white/75">Multi-Approver Mode</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Require multiple reviewers to decide the appeal outcome
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMultiApprover(v => !v)}
              className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 bg-white/10"
              style={isMultiApprover ? { background: '#EC4899' } : {}}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${isMultiApprover ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {isMultiApprover && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">
                Minimum Approvals Required
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={minApprovals}
                  onChange={e => setMinApprovals(Math.max(2, +e.target.value))}
                  className="w-24 bg-[#0D0A1A] border border-white/8 text-white/75 rounded-xl px-3 py-2 text-[14px] font-semibold text-center focus:outline-none focus:border-[#EC4899]/50"
                />
                <p className="text-[11px] text-white/35">reviewers must agree on the decision</p>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 4: Resolution Outcome Actions ── */}
      <Section icon={Settings} title="Appeal Outcome Actions" accent="#10B981">
        <div className="space-y-4 mt-3">
          {/* On Approve */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
            <p className="text-[12px] font-semibold text-emerald-400 mb-2">If appeal is APPROVED:</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnApproveAction('change_status')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${onApproveAction === 'change_status' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}
              >
                Change status to APPROVED
              </button>
              <button
                type="button"
                onClick={() => setOnApproveAction('return_to_screening')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${onApproveAction === 'return_to_screening' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}
              >
                Return to Screening
              </button>
            </div>
          </div>

          {/* On Reject */}
          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
            <p className="text-[12px] font-semibold text-red-400 mb-2">If appeal is REJECTED:</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnRejectAction('keep_rejected')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${onRejectAction === 'keep_rejected' ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/40'}`}
              >
                Keep status as REJECTED
              </button>
              <button
                type="button"
                onClick={() => setOnRejectAction('lock_candidate')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${onRejectAction === 'lock_candidate' ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/40'}`}
              >
                Lock candidate permanently
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Section 5: Visibility Rules ── */}
      <Section icon={Eye} title="Appeal Visibility Rules" accent="#3B82F6" defaultOpen={false}>
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-[11px] font-medium text-white/60 block mb-2">Who can see submitted appeals?</label>
            <div className="flex flex-wrap gap-2">
              {(['candidate', 'reviewers', 'public'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleVisibility(role)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${visibility.includes(role) ? 'bg-[#3B82F6]/20 border-[#3B82F6]/30 text-white' : 'bg-white/5 border-white/10 text-white/30'}`}
                >
                  <div className={`w-3 h-3 rounded text-[7px] flex items-center justify-center border ${visibility.includes(role) ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'border-white/30'}`}>
                    {visibility.includes(role) && '✓'}
                  </div>
                  {role === 'candidate' ? 'Candidate (Own)' : role === 'reviewers' ? 'Appeal Reviewers' : 'Public (Rare)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <p className="text-[12px] font-medium text-white/70">Show original rejection reason?</p>
              <p className="text-[11px] text-white/30">Display why they were screened out on their appeal form.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRejectionReason(v => !v)}
              className="relative w-10 h-5 rounded-full transition-all duration-200 bg-white/10"
              style={showRejectionReason ? { background: '#3B82F6' } : {}}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${showRejectionReason ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section 6: Candidate Withdrawal (Tiered) ── */}
      <Section icon={ShieldAlert} title="Candidate Withdrawal" accent="#F43F5E">
        <div className="space-y-4 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-white/75">Allow Candidate Withdrawal</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Permit candidates to submit a withdrawal request during the appeal phase.
              </p>
            </div>
            {subscription === 'BASIC' ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-lg">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80">Standard+</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAllowWithdrawal(v => !v)}
                className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 bg-white/10"
                style={allowWithdrawal ? { background: '#F43F5E' } : {}}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${allowWithdrawal ? 'left-5' : 'left-0.5'}`} />
              </button>
            )}
          </div>

          {subscription === 'BASIC' && (
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl border-dashed">
              <p className="text-[11px] text-white/30 italic">
                Candidate withdrawal management is only available for Standard and Enterprise tiers.
              </p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
});

AppealModule.displayName = 'AppealModule';
