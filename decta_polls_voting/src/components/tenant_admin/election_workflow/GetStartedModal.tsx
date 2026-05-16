"use client";

import React, { useState } from 'react';
import {
  FileText, Search, MessagesSquare,
  Globe, CheckSquare, BarChart3, Plus,
  Sparkles, ShieldCheck, Zap, Lock, X
} from 'lucide-react';
import { PHASE_PIPELINE, PhaseConfig, PhaseType } from '@/lib/types/phase';
import { BASIC_PHASES, canUsePhase, type SubscriptionTier } from '@/lib/subscription-limits';

interface GetStartedModalProps {
  subscription: SubscriptionTier;
  onComplete: (phases: PhaseConfig[]) => void;
}

const PHASE_ICONS: Record<PhaseType, React.ElementType> = {
  filing: FileText,
  screening: Search,
  appeal: MessagesSquare,
  publication: Globe,
  voting: CheckSquare,
  results: BarChart3,
};

export function GetStartedModal({ subscription, onComplete }: GetStartedModalProps) {
  const [selectedPhases, setSelectedPhases] = useState<PhaseType[]>(
    PHASE_PIPELINE.filter(p => p.required).map(p => p.type)
  );

  const isAvailable = (type: PhaseType) => {
    return canUsePhase(subscription, type);
  };

  const togglePhase = (type: PhaseType) => {
    const meta = PHASE_PIPELINE.find(p => p.type === type)!;
    if (meta.required) return;
    if (!isAvailable(type)) return;

    setSelectedPhases(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleStartBuilding = () => {
    const phases: PhaseConfig[] = PHASE_PIPELINE.map(meta => ({
      phase_type: meta.type,
      phase_index: meta.index,
      is_enabled: isAvailable(meta.type) && selectedPhases.includes(meta.type),
      name: ' ', // Placeholder per user's latest manual change
      deadline: null,
      transition_mode: 'manual',
      role_assigned: null,
      electionID: '', 
    }));
    onComplete(phases);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#0E0A1E]/80 p-3 backdrop-blur-xl animate-in fade-in duration-500 sm:p-4 lg:items-center lg:p-6">
      <div className="relative my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#141026] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.8)] sm:my-4 sm:rounded-[28px] lg:my-0 lg:max-h-[90dvh] lg:rounded-[32px]">

        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#6648EB]/10 blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] -z-10 pointer-events-none" />

        <div className="flex min-h-0 flex-col lg:flex-row">

          {/* Left Sidebar Info */}
          <div className="decta-scrollbar flex max-h-[45dvh] w-full shrink-0 flex-col overflow-y-auto border-b border-white/5 bg-white/[0.02] p-5 sm:p-6 lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r lg:p-8 xl:p-10">
            <div className="min-h-0">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6648EB] shadow-lg shadow-[#6648EB]/20 sm:h-14 sm:w-14 lg:mb-7">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:mb-4">Configure Timeline</h1>
              <p className="mb-6 text-[14px] leading-relaxed text-white/45 lg:mb-7">
                {subscription === 'BASIC'
                  ? 'Basic elections use the predefined Filing, Voting, and Results flow. Interface customization is not included in this tier.'
                  : 'Select the execution phases you want for this election. Positions setup is now a mandatory system prerequisite.'}
              </p>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="mb-1 flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">Plan Access</span>
                  </div>
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
                    {subscription} TIER
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">Selected</p>
                  <div className="flex gap-4 px-1">
                    <div>
                      <p className="text-2xl font-bold text-white">{selectedPhases.length}</p>
                      <p className="text-[10px] font-medium text-white/30">Phases</p>
                    </div>
                    <div className="mt-2 h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold text-white">1</p>
                      <p className="text-[10px] font-medium text-white/30">Setup</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartBuilding}
              className="group mt-6 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-bold text-[#0E0A1E] shadow-xl transition-all hover:gap-4 hover:bg-opacity-90 lg:mt-auto"
            >
              Initialize Pipeline
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Right Phase Grid */}
          <div className="decta-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PHASE_PIPELINE.map((meta) => {
                const Icon = PHASE_ICONS[meta.type];
                const selected = selectedPhases.includes(meta.type);
                const available = isAvailable(meta.type);
                const includedInBasic = subscription === 'BASIC' && BASIC_PHASES.includes(meta.type);

                return (
                  <button
                    key={meta.type}
                    disabled={!available}
                    onClick={() => togglePhase(meta.type)}
                    className={`group relative min-h-[164px] rounded-2xl border p-5 text-left transition-all duration-300 sm:rounded-3xl sm:p-6 ${selected
                        ? 'border-[#6648EB]/50 bg-[#6648EB]/12 shadow-[0_8px_32px_-8px_rgba(102,72,235,0.25)]'
                        : available
                          ? 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'
                          : 'cursor-not-allowed border-white/8 bg-white/[0.015] opacity-60'
                      }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all ${selected ? 'bg-[#6648EB] text-white' : 'bg-white/5 text-white/40'
                        }`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {includedInBasic ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:tracking-[0.2em]">System Required</span>
                      ) : available ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Available</span>
                      ) : !available && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-400/80">
                          <Lock className="h-3 w-3" />
                          Upgrade
                        </span>
                      )}
                    </div>

                    <h3 className={`text-[17px] font-bold mb-1.5 transition-colors ${selected ? 'text-white' : 'text-white/80'}`}>
                      {meta.defaultName}
                    </h3>
                    <p className={`text-[12px] leading-relaxed line-clamp-2 transition-colors ${selected ? 'text-white/60' : 'text-white/30'}`}>
                      {meta.description}
                    </p>

                    {selected && (
                      <div className="absolute right-5 top-5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#141026] bg-[#6648EB] shadow-[0_0_14px_rgba(102,72,235,0.45)] animate-in zoom-in duration-300">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
