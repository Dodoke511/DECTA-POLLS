'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings2, Lock, ChevronDown, ChevronUp, Zap,
  Clock, Users, AlertTriangle, BookOpen, Loader2, CheckCircle2,
  Archive, LayoutDashboard, Settings, ArrowRight, Save, Trash2, CheckSquare2,
  FastForward
} from 'lucide-react';
import { PhaseStatus } from '@/lib/workflow/PhaseResolverService';
import { PhaseStatusBadge } from '@/components/tenant_admin/PhaseStatusBadge';
import { PhaseConfig, PhaseMetadata, PhaseType, TransitionMode } from '@/lib/types/phase';
import { PositionsModule } from './modules/PositionsModule';
import { DynamicFormBuilder } from './modules/CandidateFormBuilder';
import { ScreeningModule } from './modules/ScreeningModule';
import { AppealModule } from './modules/AppealModule';
import { PublicationModule } from './modules/PublicationModule';
import { VotingModule } from './modules/VotingModule';
import { ResultsModule } from './modules/ResultsModule';

export interface TenantRole {
  id: string;
  roleName: string;
  permissions: string[];
}

interface PhaseCardProps {
  phase: PhaseConfig;
  metadata: PhaseMetadata;
  roles: TenantRole[];
  electionId: string;
  isDisabledByDependency: boolean;
  isLast: boolean;
  isFocused: boolean;
  isSucceeding: boolean;
  subscription: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
  onChange: (phaseType: PhaseType, updates: Partial<PhaseConfig>) => void;
  onToggle: (phaseType: PhaseType, enabled: boolean) => void;
  onSave: () => Promise<boolean>;
  onRefresh?: () => void;
  authParams: string;
  runtimeStatus?: PhaseStatus;
  isElectionActive?: boolean;
  tenantSlug?: string | null;
  electionSlug?: string | null;
  /** Pre-fetched positions from PipelineBuilder — avoids an extra DB round-trip in CandidateFormBuilder */
  positions?: { title?: string | null }[];
  /** Called after the card mounts so PipelineBuilder can re-enable the Next button */
  onReady?: () => void;
}

const ACCENT: Record<PhaseType, string> = {
  filing: '#5B4FD9',
  screening: '#8B5CF6',
  appeal: '#A78BFA',
  publication: '#7C3AED',
  voting: '#6648EB',
  results: '#4F46E5',
};

const PHASE_PERMISSION_MAP: Record<PhaseType, string[]> = {
  filing: ['election.filing.access', 'election.filing.insert', 'election.filing.delete', 'election.filing.update', 'election.filing.select', 'candidate.review', 'candidate.view'],
  screening: ['election.screening.access', 'election.screening.insert', 'election.screening.review', 'election.screening.delete', 'election.screening.update', 'election.screening.approval', 'screen_candidates', 'candidate.review', 'candidate.approve', 'candidate.reject'],
  appeal: ['election.appeal.access', 'election.appeal.config.update', 'election.appeal.config.edit', 'election.appeal.config.insert', 'election.appeal.config.review', 'appeal.review', 'appeal.approve', 'appeal.reject'],
  publication: ['election.publication.access', 'election.publication.insert', 'election.publication.delete', 'election.publication.update', 'result.publish', 'election.activate'],
  voting: ['election.voting.access', 'election.voting.config.update', 'election.voting.ballot.update', 'election.activate', 'voter.assign_token'],
  results: ['election.results.access', 'election.results.config.update', 'result.compute', 'result.view'],
};

export const PhaseCard = forwardRef(({
  phase, metadata, roles, electionId,
  isDisabledByDependency, isLast,
  isFocused, isSucceeding, subscription,
  onChange, onToggle, onSave, onRefresh, authParams,
  runtimeStatus, isElectionActive,
  tenantSlug, electionSlug, positions, onReady,
}: PhaseCardProps, ref): ReactElement => {
  const router = useRouter();
  const moduleRef = useRef<{ save: () => Promise<boolean> }>(null);

  // Signal to PipelineBuilder that this card has painted and Next can be re-enabled
  React.useEffect(() => { onReady?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  // Deadline-mode slug confirmation
  const [slugInput, setSlugInput] = useState({ tenant: '', election: '' });

  const canAdvance = isElectionActive && (runtimeStatus === 'active' || runtimeStatus === 'for_transition');

  const handleAdvancePhase = async () => {
    // If deadline mode, validate slug inputs match actual slugs
    if (phase.transition_mode === 'deadline') {
      if (slugInput.tenant.trim() !== (tenantSlug ?? '').trim()) {
        setAdvanceError('Tenant slug does not match. Please try again.');
        return;
      }
      if (slugInput.election.trim() !== (electionSlug ?? '').trim()) {
        setAdvanceError('Election slug does not match. Please try again.');
        return;
      }
    }
    setIsAdvancing(true);
    setAdvanceError(null);
    try {
      const res = await fetch('/api/workflow/advance_phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance phase');
      setShowAdvanceConfirm(false);
      setSlugInput({ tenant: '', election: '' });
      onRefresh?.();
    } catch (err: any) {
      setAdvanceError(err.message);
    } finally {
      setIsAdvancing(false);
    }
  };

  const openAdvanceConfirm = () => {
    setSlugInput({ tenant: '', election: '' });
    setAdvanceError(null);
    setShowAdvanceConfirm(true);
  };

  const requiredPerms = PHASE_PERMISSION_MAP[metadata.type] || [];
  const filteredRoles = roles.filter(role => {
    if (!role.permissions) return false;
    // Wildcard '*' grants everything
    if (role.permissions.includes('*')) return true;
    return requiredPerms.some(p => role.permissions.includes(p));
  });

  const accent = ACCENT[metadata.type];
  const isRequired = metadata.required;
  const isEnabled = phase.is_enabled;
  const isActive = isEnabled && !isDisabledByDependency;
  const displayName = phase.name || metadata.defaultName;

  const navigateToSettings = () => {
    const path = metadata.type === 'voting' ? 'voting-settings' : 'results-settings';
    router.push(`/users/tenant/elections/${electionId}/workflow/${path}?${authParams}`);
  };

  // ── Preflight / Validation ──
  const isPreflightValid = () => {
    if (phase.transition_mode === 'manual') return true;

    // In 'deadline' mode, we MUST have the dates that the phase requires
    if (metadata.hasStartDate && !phase.start_date) return false;
    if (metadata.hasDeadline && !phase.deadline) return false;

    return true;
  };

  const isSaveDisabled = isSaving || !isPreflightValid();

  const handleLocalSave = async () => {
    if (!isPreflightValid()) return;

    setIsSaving(true);
    setSaveStatus('saving');

    // 1. Save phase metadata
    const metaSuccess = await onSave();

    // 2. Save inner module if present
    let moduleSuccess = true;
    if (moduleRef.current) {
      moduleSuccess = await moduleRef.current.save();
    }

    if (metaSuccess && moduleSuccess) {
      setSaveStatus('success');
      onRefresh?.();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
    setIsSaving(false);
    return metaSuccess && moduleSuccess;
  };

  useImperativeHandle(ref, () => ({
    save: handleLocalSave
  }));

  return (
    <div className={`relative transition-all duration-300 w-full ${isDisabledByDependency ? 'opacity-40 pointer-events-none' : ''}`}>

      {/* ── Card ── */}
      <div
        className="rounded-[32px] border border-white/10 bg-[#141026]/60 backdrop-blur-3xl overflow-hidden ring-1 ring-white/5 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)]"
        style={{
          background: `linear-gradient(165deg, ${accent}10, rgba(20,16,38,0.95))`,
          borderColor: `${accent}30`,
        }}
      >
        {/* ─ Header ─ */}
        <div className="flex flex-col gap-6 px-8 py-8">
          {/* Labels & Editable Title */}
          <div className="w-full">
            <div className="flex items-center justify-between gap-3 mb-2 group/title relative">
              <input
                type="text"
                value={(phase.name || '').trim() === '' ? '' : phase.name}
                placeholder={(metadata.defaultName ?? 'Phase') + " ..." || 'Untitled Phase'}
                onChange={e => onChange(phase.phase_type, { name: e.target.value })}
                className={`flex-1 bg-transparent border-none text-[22px] font-bold tracking-tight outline-none transition-all duration-500 cursor-text hover:bg-white/5 rounded-lg px-2 -ml-2 ${isActive ? 'text-white placeholder:text-white' : 'text-white/20 placeholder:text-white/20'}`}
                title="Edit Phase Name"
              />

              {/* Highlight Underline */}
              <div className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transform origin-left transition-all duration-500 group-focus-within/title:w-full group-hover/title:w-1/4 opacity-0 group-focus-within/title:opacity-100 group-hover/title:opacity-50"
                style={{ background: accent }} />

              {isRequired ? (
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg bg-white/5 text-white/40 border border-white/10 flex-shrink-0">
                  Required
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  {(() => {
                    // Availability check logic
                    const isAvailable = () => {
                      if (subscription === 'BASIC') return false; // Basic only gets required phases
                      if (subscription === 'STANDARD') {
                        return metadata.type !== 'publication';
                      }
                      return true; // ENTERPRISE
                    };

                    const available = isAvailable();

                    if (!available) {
                      return (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80">Upgrade Required</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggle(phase.phase_type, !isEnabled); }}
                        className="flex-shrink-0 relative w-11 h-6 rounded-full transition-all duration-500"
                        style={{ background: isEnabled ? accent : 'rgba(255,255,255,0.1)' }}
                        title={isEnabled ? 'Disable phase' : 'Enable phase'}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ${isEnabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            <p className="text-[13px] leading-relaxed text-white/40 animate-in fade-in slide-in-from-top-1 duration-500">
              {metadata.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] self-center mr-1">Phase Type:</span>
            <span className="text-[12px] px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {metadata.type}
            </span>
            {isElectionActive && runtimeStatus && (
              <PhaseStatusBadge status={runtimeStatus} size="sm" />
            )}
          </div>
        </div>

        {/* ─ Body (only when active) ─ */}
        {isActive && (
          <div className="px-8 pb-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="w-full h-px bg-white/[0.05]" />
            {/* ─ Config fields (filing, screening, appeal, publication) ─ */}
            {!metadata.embedModule && !metadata.redirectToSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Transition mode */}
                {metadata.hasTransitionMode && (
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Transition Mode
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                      {(['manual', 'deadline'] as TransitionMode[]).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onChange(phase.phase_type, { transition_mode: mode })}
                          className={`flex-1 py-3 text-[12px] font-semibold capitalize transition-all ${phase.transition_mode === mode
                            ? 'text-white'
                            : 'text-white/35 hover:text-white/65'}`}
                          style={phase.transition_mode === mode
                            ? { background: `${accent}30`, borderBottom: `2px solid ${accent}` }
                            : { background: 'rgba(17,13,30,0.8)' }}
                        >
                          {mode === 'manual' ? '⚙ Manual' : '⏱ Deadline'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Date picker */}
                {metadata.hasStartDate && (
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Phase Opens
                      {phase.transition_mode === 'deadline' && (
                        <span className="text-amber-400/80 font-medium normal-case tracking-normal">— required</span>
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      value={phase.start_date ? phase.start_date.slice(0, 16) : ''}
                      onChange={e => onChange(phase.phase_type, { start_date: e.target.value || null })}
                      className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all [color-scheme:dark]"
                      onFocus={e => (e.target.style.borderColor = `${accent}60`)}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                )}

                {/* Deadline picker */}
                {metadata.hasDeadline && (
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {metadata.hasStartDate ? 'Phase Closes' : 'Phase Deadline'}
                      {phase.transition_mode === 'deadline' && (
                        <span className="text-amber-400/80 font-medium normal-case tracking-normal">— required</span>
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      value={phase.deadline ? phase.deadline.slice(0, 16) : ''}
                      onChange={e => onChange(phase.phase_type, { deadline: e.target.value || null })}
                      className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all [color-scheme:dark]"
                      onFocus={e => (e.target.style.borderColor = `${accent}60`)}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                )}

                {/* Completion Behavior */}
                {metadata.hasCompletionBehavior && (
                  <div className="col-span-full mt-2 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="mb-4">
                      <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                        <CheckSquare2 className="w-3 h-3" /> Completion Behavior
                      </label>
                      <p className="text-[11px] text-white/35">
                        Determine what happens when this phase advances (via deadline or manually).
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Require All Reviewed */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex h-4 w-4 shrink-0 items-center justify-center mt-0.5">
                          <input
                            type="radio"
                            name={`cb_${phase.id}`}
                            checked={phase.completion_behavior === 'require_all_reviewed'}
                            onChange={() => onChange(phase.phase_type, { completion_behavior: 'require_all_reviewed' })}
                            className="peer h-4 w-4 appearance-none rounded-full border border-white/20 bg-white/[0.02] transition-all checked:border-[#10B981] checked:border-4 hover:border-white/40 focus:outline-none"
                          />
                        </div>
                        <div>
                          <p className={`text-[13px] font-medium transition-colors ${phase.completion_behavior === 'require_all_reviewed' ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                            Require all {metadata.type === 'appeal' ? 'appeals' : 'candidates'} to be reviewed
                          </p>
                          <p className="text-[11px] text-white/30 hidden md:block">
                            Prevents advancing to the next phase if any items are still pending.
                          </p>
                        </div>
                      </label>

                      {/* Auto-Resolve */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex h-4 w-4 shrink-0 items-center justify-center mt-0.5">
                          <input
                            type="radio"
                            name={`cb_${phase.id}`}
                            checked={phase.completion_behavior === 'auto_resolve_pending'}
                            onChange={() => onChange(phase.phase_type, { completion_behavior: 'auto_resolve_pending' })}
                            className="peer h-4 w-4 appearance-none rounded-full border border-white/20 bg-white/[0.02] transition-all checked:border-[#6648EB] checked:border-4 hover:border-white/40 focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`text-[13px] font-medium transition-colors ${phase.completion_behavior === 'auto_resolve_pending' ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                            Auto-resolve pending {metadata.type === 'appeal' ? 'appeals' : 'candidates'}
                          </p>
                          <p className="text-[11px] text-white/30 hidden md:block">
                            Automatically process any unreviewed items when the phase completes.
                          </p>

                          {/* Auto-Resolve Sub-options */}
                          {phase.completion_behavior === 'auto_resolve_pending' && (
                            <div className="mt-3 pl-4 border-l-2 border-[#6648EB]/30 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-2">
                                Auto-Resolution Action
                              </label>
                              <div className="flex rounded-lg overflow-hidden border border-white/10 w-fit">
                                <button
                                  type="button"
                                  onClick={() => onChange(phase.phase_type, { auto_resolve_action: 'auto_reject' })}
                                  className={`px-4 py-2 text-[11px] font-semibold transition-all
                                    ${phase.auto_resolve_action === 'auto_reject' ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                  Auto-Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onChange(phase.phase_type, { auto_resolve_action: 'auto_approve' })}
                                  className={`px-4 py-2 text-[11px] font-semibold transition-all
                                    ${phase.auto_resolve_action === 'auto_approve' ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                  Auto-Approve
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Manager role selector */}
                {metadata.hasManagerRole && (
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Manager Role
                    </label>
                    {filteredRoles.length > 0 ? (
                      <select
                        value={phase.role_assigned ?? ''}
                        onChange={e => onChange(phase.phase_type, { role_assigned: e.target.value || null })}
                        className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all appearance-none"
                        onFocus={e => (e.target.style.borderColor = `${accent}60`)}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                      >
                        <option value="">— No role assigned —</option>
                        {filteredRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.roleName}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-white/10 bg-white/3 text-white/35 text-[12px]">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
                          <span>No roles found with required permissions.</span>
                        </div>
                        <p className="text-[10px] text-white/20">
                          Requires: {requiredPerms.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─ Embedded DynamicFormBuilder (filing) ─ */}
            {metadata.type === 'filing' && (
              <DynamicFormBuilder
                ref={moduleRef}
                electionId={electionId}
                toolName="candidate_application"
                title="Candidate Application Form"
                initialPositions={positions}
                disableAdd={runtimeStatus === 'completed'}
                disableDelete={runtimeStatus === 'active' || runtimeStatus === 'completed'}
              />
            )}

            {/* ─ Embedded ScreeningModule (screening) ─ */}
            {metadata.type === 'screening' && (
              <ScreeningModule ref={moduleRef} electionId={electionId} phaseId={phase.id} />
            )}

            {/* ─ Embedded AppealModule (appeal) ─ */}
            {metadata.type === 'appeal' && (
              <AppealModule ref={moduleRef} electionId={electionId} phaseId={phase.id} subscription={subscription}
                runtimeStatus={runtimeStatus}
              />
            )}

            {/* ─ Embedded PublicationModule (publication) ─ */}
            {metadata.type === 'publication' && (
              <PublicationModule ref={moduleRef} electionId={electionId} authParams={authParams} />
            )}

            {/* ─ Embedded VotingModule (voting) ─ */}
            {metadata.type === 'voting' && (
              <VotingModule
                ref={moduleRef}
                electionId={electionId}
                roles={roles}
                roleAssigned={phase.role_assigned}
                onRoleChange={(roleId) => onChange(phase.phase_type, { role_assigned: roleId })}
              />
            )}

            {/* ─ Embedded ResultsModule (results) ─ */}
            {metadata.type === 'results' && (
              <ResultsModule
                ref={moduleRef}
                electionId={electionId}
                subscription={subscription}
                roles={roles}
                roleAssigned={phase.role_assigned}
                onRoleChange={(roleId) => onChange(phase.phase_type, { role_assigned: roleId })}
              />
            )}

            <div className="flex justify-end pt-6">
              {/* ─ Individual Save Button ─ */}
              <div className="flex items-center justify-between gap-4 w-full border-t border-white/5 pt-6">
                <div className="flex-1">
                  {!isPreflightValid() && (
                    <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in">
                      <AlertTriangle className="w-3 h-3" />
                      {metadata.hasStartDate
                        ? 'Configure both Start & End dates for Deadline mode'
                        : 'Configure a deadline date for Deadline mode'}
                    </span>
                  )}
                  {isPreflightValid() && saveStatus === 'success' && (
                    <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Changes persisted to database
                    </span>
                  )}
                  {isPreflightValid() && saveStatus === 'error' && (
                    <span className="text-red-400 text-[12px] font-medium animate-in shake duration-500">
                      Failed to sync changes
                    </span>
                  )}
                  {isPreflightValid() && saveStatus === 'idle' && (
                    <p className="text-[11px] text-white/25 flex items-center gap-1.5">
                      <span className="text-amber-400/50">●</span>
                      Unsaved — press <span className="font-bold text-white/40">Sync &amp; Save</span> to persist changes
                    </p>
                  )}
                </div>

                <button
                  onClick={handleLocalSave}
                  disabled={isSaveDisabled}
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed text-[13px] font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                  title={!isPreflightValid() ? 'Please configure required dates to save' : 'Save all changes'}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" style={{ color: !isPreflightValid() ? '#94a3b8' : accent }} />
                  )}
                  {isSaving ? 'Syncing...' : 'Sync & Save Changes'}
                </button>

                {/* Advance Phase Button */}
                {canAdvance && (
                  <button
                    onClick={openAdvanceConfirm}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#6648EB] to-[#8B5CF6] hover:from-[#7c5fff] hover:to-[#9f75ff] text-white text-[13px] font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#6648EB]/20 flex-shrink-0"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    Advance Phase
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─ Connector to next card (Visual only in horizontal) ─ */}
      {!isLast && !isFocused && (
        <div className="absolute top-[45px] -right-4 w-8 h-px bg-white/10 z-[-1]" />
      )}

      {/* ─ Advance Phase Confirmation Modal ─ */}
      {showAdvanceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isAdvancing && setShowAdvanceConfirm(false)} />
          <div className="relative w-full max-w-md bg-[#140B2D] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6648EB]/10 rounded-full blur-3xl" />
            <div className="relative text-center space-y-6">
              <div className="w-20 h-20 bg-[#6648EB]/10 rounded-full flex items-center justify-center mx-auto border border-[#6648EB]/20">
                <FastForward className="w-10 h-10 text-[#6648EB]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Advance Phase?</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  This will complete the <span className="text-white font-bold capitalize">{phase.name || metadata.defaultName}</span> phase and activate the next phase in the pipeline.
                </p>
                {advanceError && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-[12px] font-medium">{advanceError}</p>
                  </div>
                )}
                <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <p className="text-amber-400 text-[11px] font-medium uppercase tracking-wider">
                    ⚠ This action cannot be undone.
                  </p>
                </div>

                {/* ── Deadline-mode extra verification ── */}
                {phase.transition_mode === 'deadline' && (
                  <div className="mt-4 space-y-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                        ⚠ Deadline-mode override detected
                      </p>
                      <p className="text-white/50 text-[11px] leading-relaxed">
                        This phase uses automatic deadline-based transitions. Manually advancing it will override the configured schedule. To confirm, type the <span className="font-bold text-white/70">tenant slug</span> and <span className="font-bold text-white/70">election slug</span> exactly.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">
                        Tenant Slug
                      </label>
                      <input
                        type="text"
                        value={slugInput.tenant}
                        onChange={e => setSlugInput(s => ({ ...s, tenant: e.target.value }))}
                        placeholder={tenantSlug ? `Type "${tenantSlug}" to confirm` : 'Tenant slug'}
                        className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-[#6648EB]/50 transition-all placeholder:text-white/20 [color-scheme:dark]"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">
                        Election Slug
                      </label>
                      <input
                        type="text"
                        value={slugInput.election}
                        onChange={e => setSlugInput(s => ({ ...s, election: e.target.value }))}
                        placeholder={electionSlug ? `Type "${electionSlug}" to confirm` : 'Election slug'}
                        className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-[#6648EB]/50 transition-all placeholder:text-white/20 [color-scheme:dark]"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  disabled={isAdvancing}
                  onClick={() => { setShowAdvanceConfirm(false); setSlugInput({ tenant: '', election: '' }); setAdvanceError(null); }}
                  className="flex-1 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isAdvancing || (
                    phase.transition_mode === 'deadline' && (
                      slugInput.tenant.trim() !== (tenantSlug ?? '').trim() ||
                      slugInput.election.trim() !== (electionSlug ?? '').trim()
                    )
                  )}
                  onClick={handleAdvancePhase}
                  className="flex-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6648EB] to-[#8B5CF6] text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#6648EB]/20"
                >
                  {isAdvancing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Advancing...</>
                  ) : 'Yes, Advance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PhaseCard.displayName = 'PhaseCard';
