'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle,
  Rocket, ChevronDown, ChevronUp, Bell,
} from 'lucide-react';
import { PhaseConfig, PhaseType, PHASE_PIPELINE, REQUIRED_PHASES } from '@/lib/types/phase';
import { PhaseStatus } from '@/lib/workflow/PhaseResolverService';
import { resolvePhaseStatusClient } from '@/lib/workflow/phase-guards';
import { GetStartedModal } from './GetStartedModal';
import { PhaseCard, TenantRole } from './PhaseCard';
import { PositionsModule } from './modules/PositionsModule';
import { Users } from 'lucide-react';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { canUsePhase, enforcePhaseAccess, normalizeSubscription, type SubscriptionTier } from '@/lib/subscription-limits';

const PHASE_PERMISSION_MAP: Record<PhaseType, string[]> = {
  filing: ['election.filing.access', 'election.filing.insert', 'election.filing.delete', 'election.filing.update', 'election.filing.select', 'candidate.review', 'candidate.view'],
  screening: ['election.screening.access', 'election.screening.insert', 'election.screening.review', 'election.screening.delete', 'election.screening.update', 'election.screening.approval', 'screen_candidates', 'candidate.review', 'candidate.approve', 'candidate.reject'],
  appeal: ['election.appeal.access', 'election.appeal.config.update', 'election.appeal.config.edit', 'election.appeal.config.insert', 'election.appeal.config.review', 'election.appeal.eligibility', 'election.appeal.decision', 'election.appeal.outcome', 'election.appeal.visibility', 'election.appeal.withdrawal', 'appeal.review', 'appeal.approve', 'appeal.reject'],
  publication: ['election.publication.access', 'election.publication.insert', 'election.publication.delete', 'election.publication.update', 'result.publish', 'election.activate'],
  voting: ['election.voting.access', 'election.voting.config.update', 'election.voting.ballot.update', 'election.activate', 'voter.assign_token'],
  results: ['election.results.access', 'election.results.config.update', 'result.compute', 'result.view'],
};

interface PipelineBuilderProps {
  electionId: string;
  authParams: string;
}

interface PreflightCheck {
  label: string;
  passed: boolean;
  active: boolean; // whether this check should be shown
}

interface FetchedPhase extends Partial<PhaseConfig> {
  id?: string;
  phase_type: PhaseType;
}

interface PositionSummary {
  title?: string | null;
}

function buildDefaultPipeline(electionId: string): PhaseConfig[] {
  return PHASE_PIPELINE.map(meta => ({
    electionID: electionId,
    phase_type: meta.type,
    phase_index: meta.index,
    is_enabled: REQUIRED_PHASES.includes(meta.type),
    name: "",
    deadline: null,
    role_assigned: null,
    transition_mode: 'manual' as const,
    completion_behavior: 'require_all_reviewed',
    auto_resolve_action: 'auto_reject',
  }));
}

function mergeFetchedPhases(electionId: string, fetched: FetchedPhase[], currentPhases: PhaseConfig[]): PhaseConfig[] {
  return PHASE_PIPELINE.map(meta => {
    const existing = fetched.find(p => p.phase_type === meta.type);
    const local = currentPhases.find(p => p.phase_type === meta.type);

    if (existing) {
      return {
        id: existing.id,
        electionID: electionId,
        phase_type: meta.type,
        phase_index: meta.index,
        is_enabled: existing.is_enabled ?? REQUIRED_PHASES.includes(meta.type),
        name: existing.name || '',
        start_date: existing.start_date || null,
        deadline: existing.deadline || null,
        role_assigned: existing.role_assigned || null,
        transition_mode: existing.transition_mode || 'manual',
        completion_behavior: existing.completion_behavior || 'require_all_reviewed',
        auto_resolve_action: existing.auto_resolve_action || 'auto_reject',
      };
    }

    // Fallback to local state if available, otherwise default
    return local || {
      electionID: electionId,
      phase_type: meta.type,
      phase_index: meta.index,
      is_enabled: REQUIRED_PHASES.includes(meta.type),
      name: '',
      deadline: null,
      start_date: null,
      role_assigned: null,
      transition_mode: 'manual' as const,
      completion_behavior: 'require_all_reviewed',
      auto_resolve_action: 'auto_reject',
    };
  });
}

export function PipelineBuilder({ electionId, authParams }: PipelineBuilderProps) {
  const { hasAnyPermission, isOwner, isLoaded: permsLoaded } = usePermissions();
  const [phases, setPhases] = useState<PhaseConfig[]>(buildDefaultPipeline(electionId));
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [positionsCount, setPositionsCount] = useState<number>(0);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionTier>('BASIC');
  const subscriptionRef = useRef<SubscriptionTier>('BASIC');
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activePhaseRef = useRef<{ save: () => Promise<boolean> }>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showPreflight, setShowPreflight] = useState(false);
  const [showUnsavedBanner, setShowUnsavedBanner] = useState(false);
  const [runtimeStatuses, setRuntimeStatuses] = useState<Record<string, PhaseStatus>>({});
  const [electionStatus, setElectionStatus] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [electionSlug, setElectionSlug] = useState<string | null>(null);

  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

  const refreshPhases = useCallback(async (isInitial = false) => {
    try {
      const phasesRes = await fetch(`/api/get_election_phases?electionId=${electionId}`);
      if (phasesRes.ok) {
        const { phases: fetched, election } = await phasesRes.json();
        setPhases(current => {
          const merged = mergeFetchedPhases(electionId, fetched ?? [], current);
          return enforcePhaseAccess(merged, subscriptionRef.current);
        });
        if (election) {
          if (election.status) setElectionStatus(election.status);
          if (election.tenant_slug) setTenantSlug(election.tenant_slug);
          if (election.election_slug) setElectionSlug(election.election_slug);
          // Resolve runtime statuses from DB timestamps
          const now = new Date();
          const statuses: Record<string, PhaseStatus> = {};
          ((fetched ?? []) as FetchedPhase[]).forEach((p) => {
            statuses[p.phase_type] = resolvePhaseStatusClient({
              electionID: electionId,
              phase_type: p.phase_type,
              phase_index: p.phase_index ?? PHASE_PIPELINE.find(meta => meta.type === p.phase_type)?.index ?? 0,
              is_enabled: p.is_enabled ?? REQUIRED_PHASES.includes(p.phase_type),
              name: p.name ?? '',
              start_date: (p as any).start_date ?? null,
              deadline: p.deadline ?? null,
              role_assigned: p.role_assigned ?? null,
              transition_mode: p.transition_mode || 'manual',
              completion_behavior: p.completion_behavior,
              auto_resolve_action: p.auto_resolve_action,
              // These two fields drive manual-mode resolution — MUST be forwarded from the DB row
              started_at: (p as any).started_at ?? null,
              completed_at: (p as any).completed_at ?? null,
            }, now);
          });
          setRuntimeStatuses(statuses);
        }

        if (isInitial && fetched) {
          // If we have the full pipeline (6 phases) instead of just the 3 auto-seeded required phases,
          // it means the user has already completed the GetStartedModal initialization.
          if (fetched.length === PHASE_PIPELINE.length) {
            setIsInitialized(true);
          }
        }
        return election;
      }
    } catch (err) {
      console.error('refreshPhases error:', err);
    }
  }, [electionId]);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // ── Fire subscription + phases in parallel — fastest cold start ──────────
        // refreshPhases will run with the default 'BASIC' ref, but we immediately
        // re-apply enforcePhaseAccess once the real tier is known.
        const [subRes, election] = await Promise.all([
          fetch(`/api/get_tenant_subscription?electionId=${electionId}`),
          refreshPhases(true),
        ]);

        // Resolve subscription and fix any incorrect phase enforcement from BASIC default
        if (subRes.ok) {
          const { subscription: fetchedSub } = await subRes.json();
          const normalizedSub = normalizeSubscription(fetchedSub);
          subscriptionRef.current = normalizedSub;
          setSubscription(normalizedSub);
          // Re-enforce with the real tier to undo any BASIC-default enforcement
          setPhases(current => enforcePhaseAccess(current, normalizedSub));
        }

        // ── Remaining parallel fetches (needs tenantId from election) ──────────
        const tenantId = election?.tenantID;
        const [rolesRes, positionsRes] = await Promise.all([
          tenantId
            ? fetch(`/api/get_tenant_roles?tenantId=${tenantId}`)
            : Promise.resolve({ ok: false } as Response),
          fetch(`/api/get_positions?electionId=${electionId}`),
        ]);

        if (rolesRes.ok) {
          const { roles: fetchedRoles } = await rolesRes.json();
          setRoles(fetchedRoles ?? []);
        }
        if (positionsRes.ok) {
          const { positions: fetchedPositions } = await positionsRes.json();
          const validPositions = Array.isArray(fetchedPositions)
            ? (fetchedPositions as PositionSummary[]).filter((p) => p.title?.trim())
            : [];
          setPositions(validPositions);
          setPositionsCount(validPositions.length);
        }
      } catch (err) {
        console.error('PipelineBuilder initial load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [electionId, refreshPhases]);

  // ── No DB refresh on step navigation ───────────────────────────────────────
  // Data is fetched once on mount and after explicit Sync & Save.
  // Removing this effect eliminates ~2 DB queries per step click.

  // ── Show unsaved-changes banner + mark phase card loading when navigating ─────
  const prevStepRef = useRef(activeStepIndex);
  const [isPhaseCardLoading, setIsPhaseCardLoading] = useState(false);
  useEffect(() => {
    if (!isLoading && prevStepRef.current !== activeStepIndex && activeStepIndex > 0) {
      setShowUnsavedBanner(true);
      setIsPhaseCardLoading(true); // block Next until PhaseCard signals it's mounted
    }
    prevStepRef.current = activeStepIndex;
  }, [activeStepIndex, isLoading]);

  const refreshPositions = async () => {
    try {
      const res = await fetch(`/api/get_positions?electionId=${electionId}`);
      if (res.ok) {
        const { positions: fetchedPositions } = await res.json();
        const validPositions = Array.isArray(fetchedPositions)
          ? (fetchedPositions as PositionSummary[]).filter((p) => p.title?.trim())
          : [];
        setPositions(validPositions);
        setPositionsCount(validPositions.length);
      }
    } catch (err) {
      console.error('Refresh positions error:', err);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = useCallback((phaseType: PhaseType, updates: Partial<PhaseConfig>) => {
    setPhases(prev => prev.map(p => p.phase_type === phaseType ? { ...p, ...updates } : p));
  }, []);

  const handleToggle = useCallback((phaseType: PhaseType, enabled: boolean) => {
    if (!canUsePhase(subscription, phaseType)) return;

    setPhases(prev => {
      let next = prev.map(p => p.phase_type === phaseType ? { ...p, is_enabled: enabled } : p);
      // Cascade: screening OFF → appeal OFF
      if (phaseType === 'screening' && !enabled) {
        next = next.map(p => p.phase_type === 'appeal' ? { ...p, is_enabled: false } : p);
      }
      return next;
    });
  }, [subscription]);

  const handleSave = async (updatedPhases?: PhaseConfig[]) => {
    const payload = enforcePhaseAccess(updatedPhases || phases, subscription);
    try {
      const res = await fetch('/api/save_election_phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, phases: payload }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorData: unknown = errorText;
        try {
          errorData = errorText ? JSON.parse(errorText) : { error: `Save failed with status ${res.status}` };
        } catch {
          errorData = { error: errorText || `Save failed with status ${res.status}` };
        }
        console.error('Save failed:', errorData);
        return false;
      }

      if (updatedPhases) {
        setPhases(payload);
        setIsInitialized(true);
      }
      return true;
    } catch (err) {
      console.error('API save error:', err);
      return false;
    }
  };

  const handleInitialSetup = async (chosenPhases: PhaseConfig[]) => {
    // Persist the choice to DB immediately so it's remembered on refresh
    const success = await handleSave(chosenPhases);
    if (success) {
      setPhases(chosenPhases);
      setIsInitialized(true);
    }
  };

  const isStepComplete = useCallback((idx: number) => {
    if (idx === 0) return positionsCount > 0;

    const meta = PHASE_PIPELINE[idx - 1];
    const phase = phases.find(p => p.phase_type === meta.type);
    if (!phase) return false;

    // Optional phase that has been deliberately disabled — counts as skipped/complete
    if (!phase.is_enabled && !meta.required) return true;

    // ── 1. Name is always required ───────────────────────────────────────────
    const hasName = (!!phase.name && phase.name.trim() !== '') || !!phase.id;
    if (!hasName) return false;

    // ── 2. Deadline mode: required dates per phase ───────────────────────────
    const isDeadlineMode = phase.transition_mode === 'deadline';

    if (isDeadlineMode) {
      // Phases with only a closing deadline (filing, screening, appeal, publication)
      if (meta.hasDeadline && !meta.hasStartDate && !phase.deadline) return false;
      // Phases with both open and close dates (voting, results)
      if (meta.hasStartDate && (!phase.start_date || !phase.deadline)) return false;
    }

    // ── 3. Phase-specific required fields ────────────────────────────────────
    // A role is required if transition_mode is manual (to advance the phase),
    // or if the phase has completion behaviors (like screening and appeal) even in deadline mode.
    const requiresRole = phase.transition_mode === 'manual' || meta.hasCompletionBehavior;

    switch (meta.type) {
      case 'filing':
        // No extra required fields beyond name + date handling above
        break;

      case 'screening':
        if (requiresRole && !phase.role_assigned) return false;
        break;

      case 'appeal':
        // Appeal requires Screening to be enabled (enforced at the DB level too)
        if (!phases.find(p => p.phase_type === 'screening')?.is_enabled) return false;
        if (requiresRole && !phase.role_assigned) return false;
        break;

      case 'publication':
        if (meta.hasManagerRole && requiresRole && !phase.role_assigned) return false;
        break;

      case 'voting':
        if (requiresRole && !phase.role_assigned) return false;
        break;

      case 'results':
        if (requiresRole && !phase.role_assigned) return false;
        break;
    }

    return true;
  }, [positionsCount, phases]);

  const canAccessStep = useCallback((idx: number) => {
    if (idx < 0 || idx > PHASE_PIPELINE.length) return false;
    if (idx > 0 && !canUsePhase(subscription, PHASE_PIPELINE[idx - 1].type)) return false;

    // Permission check first
    if (!isOwner && permsLoaded) {
      if (idx === 0) {
        if (!hasAnyPermission(['election.create', 'election.update'])) return false;
      } else {
        const meta = PHASE_PIPELINE[idx - 1];
        const requiredPerms = PHASE_PERMISSION_MAP[meta.type] || [];
        // If they don't have any of the required permissions for this phase, lock it
        if (requiredPerms.length > 0 && !hasAnyPermission(requiredPerms)) return false;
      }
    }

    // Dependency check: To access step N, all previous steps must be complete
    for (let i = 0; i < idx; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  }, [isStepComplete, isOwner, permsLoaded, hasAnyPermission, subscription]);

  // Jump to first accessible step if the current one is locked
  useEffect(() => {
    if (permsLoaded && !canAccessStep(activeStepIndex)) {
      // Find first accessible step
      for (let i = 0; i < PHASE_PIPELINE.length + 1; i++) {
        if (canAccessStep(i)) {
          setActiveStepIndex(i);
          break;
        }
      }
    }
  }, [permsLoaded, activeStepIndex, canAccessStep]);

  const goToNext = () => {
    // Navigation only — no auto-save. Use "Sync & Save" button to persist changes.
    const currentStepComplete = isStepComplete(activeStepIndex);

    if (activeStepIndex < steps.length - 1 && currentStepComplete) {
      for (let nextIdx = activeStepIndex + 1; nextIdx < steps.length; nextIdx++) {
        if (canAccessStep(nextIdx)) {
          setActiveStepIndex(nextIdx);
          break;
        }
      }
    }
  };

  const goToPrev = () => {
    let prevIdx = activeStepIndex - 1;
    while (prevIdx >= 0) {
      if (canAccessStep(prevIdx)) {
        setActiveStepIndex(prevIdx);
        break;
      }
      prevIdx--;
    }
  };

  // ── Pre-flight checks ────────────────────────────────────────────────────────
  const screeningPhase = phases.find(p => p.phase_type === 'screening');
  const appealPhase = phases.find(p => p.phase_type === 'appeal');
  const filingPhase = phases.find(p => p.phase_type === 'filing');
  const screeningEnabled = screeningPhase?.is_enabled ?? false;
  const appealEnabled = appealPhase?.is_enabled ?? false;

  const votingPhase = phases.find(p => p.phase_type === 'voting');
  const resultsPhase = phases.find(p => p.phase_type === 'results');

  const preflightChecks: PreflightCheck[] = [
    {
      label: 'At least one electoral position is defined',
      passed: positionsCount > 0,
      active: true,
    },
    {
      label: 'Filing phase deadline is configured',
      passed: !!(filingPhase?.deadline),
      active: filingPhase?.transition_mode === 'deadline',
    },
    {
      label: 'Screening phase has a manager role assigned',
      passed: !!(screeningPhase?.role_assigned),
      active: screeningEnabled,
    },
    {
      label: 'Appeal phase requires Screening to be enabled',
      passed: screeningEnabled,
      active: appealEnabled,
    },
    {
      label: 'Voting period (start & end) is configured',
      passed: !!(votingPhase?.start_date && votingPhase?.deadline),
      active: votingPhase?.transition_mode === 'deadline',
    },
    {
      label: 'Results period (start & end) is configured',
      passed: !!(resultsPhase?.start_date && resultsPhase?.deadline),
      active: resultsPhase?.transition_mode === 'deadline',
    },
  ];

  const activeChecks = preflightChecks.filter(c => c.active);
  const passedCount = activeChecks.filter(c => c.passed).length;
  const allPassed = passedCount === activeChecks.length;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-10 flex flex-col items-center justify-center h-48 space-y-4">
        <div className="loader font-montserrat font-bold text-white text-xl">
          Loading
          <div className="words ml-2">
            <span className="word">Pipeline</span>
            <span className="word">Phases</span>
            <span className="word">Config</span>
            <span className="word">Engine</span>
          </div>
        </div>
      </div>
    );
  }

  // Combine Positions Setup and Phase Pipeline for the progress bar
  const steps = [
    { type: 'positions', label: 'Electoral Positions', icon: null },
    ...PHASE_PIPELINE.map(m => ({ type: m.type, label: m.defaultName, icon: null }))
  ];
  const hasNextStep = Array.from({ length: steps.length - activeStepIndex - 1 })
    .some((_, i) => canAccessStep(activeStepIndex + i + 1));

  return (
    <div className="w-full max-w-[1400px] mx-auto mt-8 mb-24 px-6 animate-in fade-in duration-1000">

      {!isInitialized && (
        <GetStartedModal
          subscription={subscription}
          onComplete={handleInitialSetup}
        />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text">Electoral Pipeline Phase Builder</h2>
          <p className="text-[12px] text-white/40 mt-1">Configure your election workflow here.</p>
        </div>
        <div className="flex items-center gap-4">
          {electionStatus && (
            <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border ${electionStatus === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20' :
              electionStatus === 'PUBLISHED' ? 'bg-sky-500/10 border-sky-500/20' :
                'bg-white/5 border-white/10'
              }`}>
              <div className={`w-2 h-2 rounded-full ${electionStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                electionStatus === 'PUBLISHED' ? 'bg-sky-400' :
                  'bg-white/30'
                }`} />
              <span className={`text-[11px] font-black uppercase tracking-widest ${electionStatus === 'ACTIVE' ? 'text-emerald-400' :
                electionStatus === 'PUBLISHED' ? 'text-sky-400' :
                  'text-white/50'
                }`}>{electionStatus}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${allPassed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
              {allPassed ? 'System Ready' : 'Pending Config'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Wizard Layout ──────────────────────────────────────────────── */}
      <div className="relative mt-4">
        {/* Step Indicator / Progress Bar */}
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
          {(() => {
            // Determine which wizard step corresponds to the currently live election phase.
            // steps[0] = Positions setup (not a phase); steps[1..6] map to PHASE_PIPELINE[0..5].
            // runtimeStatuses is keyed by PhaseType; 'active' or 'for_transition' = live.
            const livePhaseType = Object.entries(runtimeStatuses).find(
              ([, status]) => status === 'active' || status === 'for_transition'
            )?.[0];
            const livePhaseStepIndex = livePhaseType
              ? PHASE_PIPELINE.findIndex(m => m.type === livePhaseType) + 1  // +1 because step 0 = Positions
              : -1;

            return steps.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              const isPast = idx < activeStepIndex;
              const isLocked = !canAccessStep(idx);
              const isLivePhase = electionStatus === 'ACTIVE' && livePhaseStepIndex === idx;

              return (
                <button
                  key={step.type}
                  onClick={() => !isLocked && setActiveStepIndex(idx)}
                  disabled={isLocked}
                  className={`flex flex-col gap-2 group outline-none min-w-[120px] transition-all ${isLocked ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isActive ? 'bg-white text-[#0E0A1E] scale-110 shadow-lg' : isPast ? 'bg-[#5D44F8] text-white' : 'bg-white/5 text-white/20'
                        }`}>
                        {idx}
                      </div>
                      {/* Live election phase pip */}
                      {isLivePhase && (
                        <span
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse ring-2 ring-[#0E0A1E]"
                          title="This phase is currently live"
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold uppercase tracking-widest transition-all ${isActive ? 'text-white' : isPast ? 'text-[#9686f8]' : 'text-white/50 group-hover:text-white/40'}`}>
                        {step.label}
                      </span>
                      {isLivePhase && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80 animate-pulse">
                          ● Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`h-[3px] w-full rounded-full transition-all duration-500 ${isLivePhase
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                      : isActive
                        ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                        : isPast
                          ? 'bg-[#5D44F8]'
                          : 'bg-white/5'
                    }`} />
                </button>
              );
            });
          })()}
        </div>

        {/* Phase View with Nav Buttons */}
        <div className="flex items-start justify-center gap-12 relative min-h-[600px]">
          {/* Prev Button */}
          <button
            onClick={goToPrev}
            disabled={activeStepIndex === 0 || !Array.from({ length: activeStepIndex }).some((_, i) => canAccessStep(i))}
            className="sticky top-48 p-4 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-110 active:scale-95 z-20"
          >
            <ChevronDown className="w-6 h-6 rotate-90" />
          </button>

          {/* Active Phase Card Container */}
          <div className="w-full max-w-[900px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeStepIndex === 0 ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-8 px-4 py-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-2 ml-2">
                    <Users className="w-6 h-6" />
                    <h3 className="text-xl font-bold text-white">Set Electoral Positions</h3>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed ml-2">This setup is a mandatory system requirement. Define all positions candidates can run for before proceeding to the pipeline configuration.</p>
                  <PositionsModule electionId={electionId} onSaveSuccess={refreshPositions} />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {PHASE_PIPELINE.map((meta, idx) => {
                  if (idx + 1 !== activeStepIndex) return null;

                  const phase = phases.find(p => p.phase_type === meta.type)!;
                  const isDisabledByDependency = meta.requiresPhase
                    ? !(phases.find(p => p.phase_type === meta.requiresPhase)?.is_enabled)
                    : false;

                  return (
                    <PhaseCard
                      key={meta.type}
                      ref={activePhaseRef}
                      phase={phase}
                      metadata={meta}
                      roles={roles}
                      electionId={electionId}
                      isDisabledByDependency={isDisabledByDependency}
                      isLast={idx === PHASE_PIPELINE.length - 1}
                      isFocused={true}
                      isSucceeding={false}
                      subscription={subscription}
                      onChange={handleChange}
                      onToggle={handleToggle}
                      onSave={() => handleSave()}
                      onRefresh={() => refreshPhases()}
                      authParams={authParams}
                      runtimeStatus={runtimeStatuses[meta.type]}
                      isElectionActive={electionStatus === 'ACTIVE'}
                      tenantSlug={tenantSlug}
                      electionSlug={electionSlug}
                      positions={positions}
                      onReady={() => setIsPhaseCardLoading(false)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNext}
            disabled={!hasNextStep || !isStepComplete(activeStepIndex) || isLoading || isPhaseCardLoading}
            className={`sticky top-48 p-4 rounded-2xl border transition-all hover:scale-110 active:scale-95 z-20 shadow-lg 
              ${(!isStepComplete(activeStepIndex) || !hasNextStep || isLoading || isPhaseCardLoading)
                ? 'bg-amber-500/5 border-amber-500/10 text-amber-500/40 cursor-not-allowed opacity-50'
                : 'bg-[#6648EB]/10 border-[#6648EB]/20 text-[#6648EB] hover:text-white hover:bg-[#6648EB] shadow-[#6648EB]/10'
              }`}
            title={(() => {
              if (!hasNextStep) return 'No available next phase for your plan';
              if (isStepComplete(activeStepIndex)) return 'Go to next step (your changes are not saved yet — use Sync & Save)';

              if (activeStepIndex === 0) return 'Please add at least one electoral position to proceed';

              const meta = PHASE_PIPELINE[activeStepIndex - 1];
              const phase = phases.find(p => p.phase_type === meta.type);
              if (!phase) return 'Phase configuration not found';

              if (!phase.name?.trim() && !phase.id) return `Enter a name for the ${meta.defaultName} phase`;

              if (phase.transition_mode === 'deadline') {
                if (meta.hasStartDate && !phase.start_date) return `Set the ${meta.defaultName} start date`;
                if (meta.hasDeadline && !phase.deadline) return `Set the ${meta.defaultName} deadline date`;
              }

              if ((meta.type === 'screening' || meta.type === 'appeal' || meta.type === 'voting' || meta.type === 'results' || (meta.type === 'publication' && meta.hasManagerRole)) && phase.transition_mode === 'manual' && !phase.role_assigned) {
                return `Assign a Manager Role for the ${meta.defaultName} phase`;
              }
              if (meta.type === 'appeal' && !phases.find(p => p.phase_type === 'screening')?.is_enabled) {
                return 'Enable the Screening phase before configuring Appeal';
              }

              return 'Complete all required fields to proceed';
            })()}
          >
            <ChevronDown className="w-6 h-6 -rotate-90" />
          </button>
        </div>
      </div>

      {/* ── Unsaved Changes Banner ────────────────────────────────────────────── */}
      {showUnsavedBanner && activeStepIndex > 0 && (
        <div className="mt-6 mx-auto max-w-4xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 backdrop-blur-sm">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-amber-300">
                Don&apos;t forget to save your changes!
              </p>
              <p className="text-[11px] text-amber-400/60 mt-0.5">
                Navigating between steps does <span className="font-bold text-amber-400/80">not</span> save your configuration.
                Press &ldquo;<span className="font-bold text-amber-300">Sync &amp; Save Changes</span>&rdquo; inside each phase card to persist your settings to the database.
              </p>
            </div>
            <button
              onClick={() => setShowUnsavedBanner(false)}
              className="flex-shrink-0 text-amber-400/50 hover:text-amber-300 transition-colors text-[18px] leading-none font-light px-1"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Pre-flight Panel ─────────────────────────────────────────────────── */}
      <div className="mt-10 mx-auto max-w-4xl rounded-[24px] border border-white/8 bg-[#110D1E]/40 backdrop-blur-2xl overflow-hidden group hover:border-[#6648EB]/30 transition-all">
        <button
          onClick={() => setShowPreflight(v => !v)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12 ${allPassed ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}
            >
              {allPassed
                ? <Rocket className="w-5 h-5 text-emerald-400" />
                : <AlertTriangle className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="text-left">
              <p className={`text-[14px] font-bold tracking-tight ${allPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {allPassed ? 'Ready for Deployment' : `Pre-flight System: ${passedCount}/${activeChecks.length} checks passed`}
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">Validation of all required phase configurations and rules</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
            {showPreflight ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>

        {showPreflight && (
          <div className="px-8 pb-7 border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChecks.map((check, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border ${check.passed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/3 border-white/5'}`}
              >
                {check.passed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400/60 flex-shrink-0 mt-0.5" />}
                <span className={`text-[12px] font-medium leading-snug ${check.passed ? 'text-white/70' : 'text-white/40'}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
