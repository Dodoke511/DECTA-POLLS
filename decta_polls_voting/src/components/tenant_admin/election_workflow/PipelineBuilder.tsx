'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  Rocket, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PhaseConfig, PhaseType, PHASE_PIPELINE, REQUIRED_PHASES, OPTIONAL_PHASES } from '@/lib/types/phase';
import { GetStartedModal } from './GetStartedModal';
import { PhaseCard, TenantRole } from './PhaseCard';
import { PositionsModule } from './modules/PositionsModule';
import { Users } from 'lucide-react';

interface PipelineBuilderProps {
  electionId: string;
  authParams: string;
}

interface ElectionMeta {
  startDate: string | null;
  endDate: string | null;
}

interface PreflightCheck {
  label: string;
  passed: boolean;
  active: boolean; // whether this check should be shown
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
  }));
}

function mergeFetchedPhases(electionId: string, fetched: any[]): PhaseConfig[] {
  return PHASE_PIPELINE.map(meta => {
    const existing = fetched.find((p: any) => p.phase_type === meta.type);
    if (existing) {
      return {
        id: existing.id,
        electionID: electionId,
        phase_type: meta.type,
        phase_index: meta.index,
        is_enabled: existing.is_enabled,
        name: existing.name || '',
        deadline: existing.deadline || null,
        role_assigned: existing.role_assigned || null,
        transition_mode: existing.transition_mode || 'manual',
      };
    }
    // Optional phase not yet in DB
    return {
      electionID: electionId,
      phase_type: meta.type,
      phase_index: meta.index,
      is_enabled: false,
      name: '',
      deadline: null,
      role_assigned: null,
      transition_mode: 'manual' as const,
    };
  });
}

export function PipelineBuilder({ electionId, authParams }: PipelineBuilderProps) {
  const [phases, setPhases] = useState<PhaseConfig[]>(buildDefaultPipeline(electionId));
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [electionMeta, setElectionMeta] = useState<ElectionMeta | null>(null);
  const [positionsCount, setPositionsCount] = useState<number>(0);
  const [subscription, setSubscription] = useState<'BASIC' | 'STANDARD' | 'ENTERPRISE'>('BASIC');
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [showPreflight, setShowPreflight] = useState(false);

  const refreshPhases = useCallback(async (isInitial = false) => {
    try {
      const phasesRes = await fetch(`/api/get_election_phases?electionId=${electionId}`);
      if (phasesRes.ok) {
        const { phases: fetched, election } = await phasesRes.json();
        const merged = mergeFetchedPhases(electionId, fetched ?? []);
        setPhases(merged);
        if (election) setElectionMeta(election);

        if (isInitial && fetched) {
          // If we have the full pipeline (6 phases) instead of just the 3 auto-seeded required phases,
          // it means the user has already completed the GetStartedModal initialization.
          if (fetched.length === PHASE_PIPELINE.length) {
            setIsInitialized(true);
          }
        }
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
        const [rolesRes, positionsRes, subRes] = await Promise.all([
          fetch(`/api/get_tenant_roles?electionId=${electionId}`),
          fetch(`/api/get_positions?electionId=${electionId}`),
          fetch(`/api/get_tenant_subscription?electionId=${electionId}`),
        ]);

        await refreshPhases(true);

        if (subRes.ok) {
          const { subscription: fetchedSub } = await subRes.json();
          if (fetchedSub) setSubscription(fetchedSub);
        }
        if (rolesRes.ok) {
          const { roles: fetchedRoles } = await rolesRes.json();
          setRoles(fetchedRoles ?? []);
        }
        if (positionsRes.ok) {
          const { positions } = await positionsRes.json();
          setPositionsCount(Array.isArray(positions)
            ? positions.filter((p: any) => p.title?.trim()).length
            : 0);
        }
      } catch (err) {
        console.error('PipelineBuilder initial load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [electionId, refreshPhases]);

  // ── Refresh when navigating steps ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && activeStepIndex > 0) {
      refreshPhases();
    }
  }, [activeStepIndex, refreshPhases, isLoading]);

  const refreshPositions = async () => {
    try {
      const res = await fetch(`/api/get_positions?electionId=${electionId}`);
      if (res.ok) {
        const { positions } = await res.json();
        setPositionsCount(Array.isArray(positions)
          ? positions.filter((p: any) => p.title?.trim()).length
          : 0);
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
    setPhases(prev => {
      let next = prev.map(p => p.phase_type === phaseType ? { ...p, is_enabled: enabled } : p);
      // Cascade: screening OFF → appeal OFF
      if (phaseType === 'screening' && !enabled) {
        next = next.map(p => p.phase_type === 'appeal' ? { ...p, is_enabled: false } : p);
      }
      return next;
    });
  }, []);

  const handleSave = async (updatedPhases?: PhaseConfig[]) => {
    const payload = updatedPhases || phases;
    try {
      const res = await fetch('/api/save_election_phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, phases: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Save failed:', errorData);
        return false;
      }

      if (updatedPhases) {
        setPhases(updatedPhases);
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

    // A phase is "complete" enough to move past it if:
    // 1. It's optional and disabled (skipped)
    // 2. It has been saved to the DB (has an id) AND has a customized name
    // (Note: Future logic for "phase rule" check can be added here once implemented)
    if (!phase.is_enabled && !meta.required) return true;

    const hasBeenSaved = !!phase.id;
    const hasName = !!phase.name && phase.name.trim() !== "";

    return hasBeenSaved && hasName;
  }, [positionsCount, phases]);

  const canAccessStep = useCallback((idx: number) => {
    if (idx === 0) return true;
    // To access step N, all steps from 0 to N-1 must be complete
    for (let i = 0; i < idx; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  }, [isStepComplete]);

  const goToNext = () => {
    if (activeStepIndex < steps.length - 1 && isStepComplete(activeStepIndex)) {
      setActiveStepIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
    }
  };

  // ── Pre-flight checks ────────────────────────────────────────────────────────
  const screeningPhase = phases.find(p => p.phase_type === 'screening');
  const appealPhase = phases.find(p => p.phase_type === 'appeal');
  const filingPhase = phases.find(p => p.phase_type === 'filing');
  const screeningEnabled = screeningPhase?.is_enabled ?? false;
  const appealEnabled = appealPhase?.is_enabled ?? false;

  const preflightChecks: PreflightCheck[] = [
    {
      label: 'At least one electoral position is defined',
      passed: positionsCount > 0,
      active: true,
    },
    {
      label: 'Filing phase has a deadline configured',
      passed: !!(filingPhase?.deadline),
      active: true,
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
      label: 'Filing deadline mode requires a deadline to be set',
      passed: filingPhase?.transition_mode === 'manual' || !!(filingPhase?.deadline),
      active: filingPhase?.transition_mode === 'deadline',
    },
    {
      label: 'Voting period (start & end) is configured',
      passed: !!(electionMeta?.startDate && electionMeta?.endDate),
      active: true,
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">Electoral Pipeline Phase Builder</h2>
          <p className="text-[12px] text-white/40 mt-1">Configure your election workflow here.</p>
        </div>
        <div className="flex items-center gap-4">
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
          {steps.map((step, idx) => {
            const isActive = activeStepIndex === idx;
            const isPast = idx < activeStepIndex;
            const isLocked = !canAccessStep(idx);

            return (
              <button
                key={step.type}
                onClick={() => !isLocked && setActiveStepIndex(idx)}
                disabled={isLocked}
                className={`flex flex-col gap-2 group outline-none min-w-[120px] transition-all ${isLocked ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isActive ? 'bg-white text-[#0E0A1E] scale-110 shadow-lg' : isPast ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'
                    }`}>
                    {idx}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-widest transition-all ${isActive ? 'text-white' : 'text-white/20 group-hover:text-white/40'}`}>
                    {step.label}
                  </span>
                </div>
                <div className={`h-[3px] w-full rounded-full transition-all duration-500 ${isActive ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : isPast ? 'bg-emerald-500/40' : 'bg-white/5'
                  }`} />
              </button>
            );
          })}
        </div>

        {/* Phase View with Nav Buttons */}
        <div className="flex items-start justify-center gap-12 relative min-h-[600px]">
          {/* Prev Button */}
          <button
            onClick={goToPrev}
            disabled={activeStepIndex === 0}
            className="sticky top-48 p-4 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-110 active:scale-95 z-20"
          >
            <ChevronDown className="w-6 h-6 rotate-90" />
          </button>

          {/* Active Phase Card Container */}
          <div className="w-full max-w-[900px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeStepIndex === 0 ? (
              <div className="animate-in fade-in zoom-in-95 duration-500">
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
              <div className="animate-in fade-in zoom-in-95 duration-500">
                {PHASE_PIPELINE.map((meta, idx) => {
                  if (idx + 1 !== activeStepIndex) return null;

                  const phase = phases.find(p => p.phase_type === meta.type)!;
                  const isDisabledByDependency = meta.requiresPhase
                    ? !(phases.find(p => p.phase_type === meta.requiresPhase)?.is_enabled)
                    : false;

                  return (
                    <PhaseCard
                      key={meta.type}
                      phase={phase}
                      metadata={meta}
                      roles={roles}
                      electionId={electionId}
                      isDisabledByDependency={isDisabledByDependency}
                      isLast={idx === PHASE_PIPELINE.length - 1}
                      isFocused={true} // In wizard mode, the single shown card is always "focused"
                      isSucceeding={false}
                      subscription={subscription}
                      onChange={handleChange}
                      onToggle={handleToggle}
                      onSave={() => handleSave([phase])}
                      onRefresh={() => refreshPhases()}
                      authParams={authParams}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNext}
            disabled={activeStepIndex === steps.length - 1 || !isStepComplete(activeStepIndex)}
            className={`sticky top-48 p-4 rounded-2xl border transition-all hover:scale-110 active:scale-95 z-20 shadow-lg 
              ${!isStepComplete(activeStepIndex)
                ? 'bg-amber-500/5 border-amber-500/10 text-amber-500/40 cursor-not-allowed opacity-50'
                : 'bg-[#6648EB]/10 border-[#6648EB]/20 text-[#6648EB] hover:text-white hover:bg-[#6648EB] shadow-[#6648EB]/10'
              }`}
            title={!isStepComplete(activeStepIndex) ? "Please complete current step to proceed" : "Next Step"}
          >
            <ChevronDown className="w-6 h-6 -rotate-90" />
          </button>
        </div>
      </div>

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
