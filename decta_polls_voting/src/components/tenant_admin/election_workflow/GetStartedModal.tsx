"use client";

import React, { useState } from 'react';
import {
  FileText, Search, MessagesSquare,
  Globe, CheckSquare, BarChart3, Plus,
  Sparkles, ShieldCheck, Zap
} from 'lucide-react';
import { PhaseMetadata, PHASE_PIPELINE, PhaseConfig, PhaseType } from '@/lib/types/phase';

interface GetStartedModalProps {
  subscription: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
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
    const meta = PHASE_PIPELINE.find(p => p.type === type)!;
    if (meta.required) return true;

    if (subscription === 'BASIC') return false;
    if (subscription === 'STANDARD') {
      return type !== 'publication';
    }
    return true; // ENTERPRISE
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
      is_enabled: selectedPhases.includes(meta.type),
      name: ' ', // Placeholder per user's latest manual change
      deadline: null,
      transition_mode: 'manual',
      role_assigned: null,
      electionID: '', 
    }));
    onComplete(phases);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0E0A1E]/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-5xl bg-[#141026] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_120px_-20px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">

        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#6648EB]/10 blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row h-full overflow-hidden">

          {/* Left Sidebar Info */}
          <div className="w-full md:w-[320px] p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
            <div className="w-14 h-14 rounded-2xl bg-[#6648EB] flex items-center justify-center mb-8 shadow-lg shadow-[#6648EB]/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Configure Timeline</h1>
            <p className="text-white/40 text-[14px] leading-relaxed mb-8">
              Select the execution phases you want for this election. Note: Positions setup is now a mandatory system prerequisite.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[12px] font-bold text-white/80 uppercase tracking-wider">Plan Access</span>
                </div>
                <p className="text-[15px] text-white font-semibold flex items-center gap-2">
                  {subscription} TIER
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] px-1">Selected</p>
                <div className="flex gap-4 px-1">
                  <div>
                    <p className="text-2xl font-bold text-white">{selectedPhases.length}</p>
                    <p className="text-[10px] text-white/30 font-medium">Phases</p>
                  </div>
                  <div className="w-px h-8 bg-white/10 mt-2" />
                  <div>
                    <p className="text-2xl font-bold text-white">1</p>
                    <p className="text-[10px] text-white/30 font-medium">Setup</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartBuilding}
              className="mt-12 w-full py-4 bg-white text-[#0E0A1E] font-bold rounded-2xl flex items-center justify-center gap-2 group hover:gap-4 transition-all hover:bg-opacity-90 shadow-xl"
            >
              Initialize Pipeline
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Right Phase Grid */}
          <div className="flex-1 p-8 md:p-10 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PHASE_PIPELINE.map((meta) => {
                const Icon = PHASE_ICONS[meta.type];
                const selected = selectedPhases.includes(meta.type);
                const available = isAvailable(meta.type);
                const required = meta.required;

                return (
                  <button
                    key={meta.type}
                    disabled={!available}
                    onClick={() => togglePhase(meta.type)}
                    className={`relative p-6 rounded-3xl border text-left transition-all duration-300 group ${selected
                        ? 'bg-[#6648EB]/10 border-[#6648EB]/40 shadow-[0_8px_32px_-8px_rgba(102,72,235,0.2)]'
                        : available
                          ? 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                          : 'bg-black/20 border-white/5 opacity-40 grayscale cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selected ? 'bg-[#6648EB] text-white' : 'bg-white/5 text-white/40'
                        }`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {required ? (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-white/5 text-white/30 border border-white/10">System Required</span>
                      ) : !available && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-amber-500/10 text-amber-500/80 border border-amber-500/20">Upgrade Needed</span>
                      )}
                    </div>

                    <h3 className={`text-[17px] font-bold mb-1.5 transition-colors ${selected ? 'text-white' : 'text-white/80'}`}>
                      {meta.defaultName}
                    </h3>
                    <p className={`text-[12px] leading-relaxed line-clamp-2 transition-colors ${selected ? 'text-white/60' : 'text-white/30'}`}>
                      {meta.description}
                    </p>

                    {selected && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#6648EB] rounded-full flex items-center justify-center border-4 border-[#141026] animate-in zoom-in duration-300">
                        <Plus className="w-3.5 h-3.5 text-white rotate-45" />
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
