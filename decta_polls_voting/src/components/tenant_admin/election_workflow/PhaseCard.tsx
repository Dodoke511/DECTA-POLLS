'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings2, Lock, ChevronDown, ChevronUp, Zap,
  Clock, Users, AlertTriangle, BookOpen, Loader2, CheckCircle2
} from 'lucide-react';
import { PhaseConfig, PhaseMetadata, PhaseType, TransitionMode } from '@/lib/types/phase';
import { PositionsModule } from './modules/PositionsModule';
import { CandidateFormBuilder } from './modules/CandidateFormBuilder';

export interface TenantRole {
  id: string;
  roleName: string;
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
}

const ACCENT: Record<PhaseType, string> = {
  filing: '#5B4FD9',
  screening: '#8B5CF6',
  appeal: '#A78BFA',
  publication: '#7C3AED',
  voting: '#6648EB',
  results: '#4F46E5',
};

export function PhaseCard({
  phase, metadata, roles, electionId,
  isDisabledByDependency, isLast,
  isFocused, isSucceeding, subscription,
  onChange, onToggle, onSave, onRefresh, authParams,
}: PhaseCardProps) {
  const router = useRouter();
  const moduleRef = useRef<{ save: () => Promise<boolean> }>(null);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const accent = ACCENT[metadata.type];
  const isRequired = metadata.required;
  const isEnabled = phase.is_enabled;
  const isActive = isEnabled && !isDisabledByDependency;
  const displayName = phase.name || metadata.defaultName;

  const navigateToSettings = () => {
    const path = metadata.type === 'voting' ? 'voting-settings' : 'results-settings';
    router.push(`/users/tenant/elections/${electionId}/workflow/${path}?${authParams}`);
  };

  const handleLocalSave = async () => {
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
  };

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
                value={phase.name.trim() === '' ? '' : phase.name}
                placeholder={metadata.defaultName + " ..." || 'Untitled Phase'}
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
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] self-center mr-1">Phase Type:</span>
            <span className="text-[12px] px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {metadata.type}
            </span>
          </div>
        </div>

        {/* ─ Body (only when active) ─ */}
        {isActive && (
          <div className="px-8 pb-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="w-full h-px bg-white/[0.05]" />

            {/* ─ Embedded PositionsModule ─ */}
            {metadata.embedModule && (
              <PositionsModule electionId={electionId} />
            )}

            {/* ─ Settings redirect (voting / results) ─ */}
            {metadata.redirectToSettings && (
              <button
                onClick={navigateToSettings}
                className="flex items-center gap-3 w-full p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all group text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
                >
                  <Settings2 className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">
                    Configure {metadata.defaultName} Settings
                  </p>
                  <p className="text-[11px] text-white/35">
                    {metadata.type === 'voting'
                      ? 'Set ballot type, voter eligibility, and voting period'
                      : 'Configure results visibility, tallying method, and download access'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 -rotate-90 transition-colors flex-shrink-0" />
              </button>
            )}

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

                {/* Deadline picker */}
                {metadata.hasDeadline && (
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Phase Deadline
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

                {/* Manager role selector */}
                {metadata.hasManagerRole && (
                  <div className={metadata.hasTransitionMode ? '' : 'col-span-full'}>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Manager Role
                    </label>
                    {roles.length > 0 ? (
                      <select
                        value={phase.role_assigned ?? ''}
                        onChange={e => onChange(phase.phase_type, { role_assigned: e.target.value || null })}
                        className="w-full bg-[#110D1E]/80 border border-white/10 text-white/80 rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all appearance-none"
                        onFocus={e => (e.target.style.borderColor = `${accent}60`)}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                      >
                        <option value="">— No role assigned —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.roleName}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/8 bg-white/3 text-white/35 text-[12px]">
                        <AlertTriangle className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
                        No roles defined yet. Create roles in Settings first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─ Embedded CandidateFormBuilder ─ */}
            {metadata.type === 'filing' && (
              <CandidateFormBuilder ref={moduleRef} electionId={electionId} />
            )}

            {/* ─ Rules section (stub) ─ */}
            <div className='flex justify-between'>
              <button
                onClick={() => setIsRulesExpanded(v => !v)}
                className="flex items-center gap-2 text-[11px] font-semibold text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Phase Rules
                {isRulesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isRulesExpanded && (
                <div className="mt-3 p-4 rounded-xl border border-dashed border-white/10 bg-white/2">
                  <p className="text-[12px] text-white/35 leading-relaxed">
                    <span className="text-white/50 font-semibold">Rules Engine</span> — Attach transition conditions to this phase
                    (e.g. "All candidates must have a screening decision before advancing").
                    Rules configuration will be available in a future update.
                  </p>
                  <button
                    disabled
                    className="mt-3 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/30 cursor-not-allowed"
                  >
                    + Attach Rule (coming soon)
                  </button>
                </div>
              )}

              {/* ─ Individual Save Button ─ */}
              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                <div className="flex-1">
                  {saveStatus === 'success' && (
                    <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 transition-all">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Changes persisted to database
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-400 text-[12px] font-medium animate-in shake duration-500">
                      Failed to sync changes
                    </span>
                  )}
                  {saveStatus === 'idle' && (
                    <p className="text-[11px] text-white/20">Last automatic check: Just now</p>
                  )}
                </div>

                <button
                  onClick={handleLocalSave}
                  disabled={isSaving}
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed text-[13px] font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
                  )}
                  {isSaving ? 'Syncing...' : 'Sync & Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─ Connector to next card (Visual only in horizontal) ─ */}
      {!isLast && !isFocused && (
        <div className="absolute top-[45px] -right-4 w-8 h-px bg-white/10 z-[-1]" />
      )}
    </div>
  );
}
