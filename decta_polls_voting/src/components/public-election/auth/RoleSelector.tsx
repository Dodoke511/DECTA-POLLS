import React from 'react';
import { PhaseState, isPhaseActive } from '@/lib/public-election/phase-utils';

interface RoleSelectorProps {
  onSelect: (view: 'candidate-register' | 'candidate-login' | 'user-login') => void;
  config: {
    auth_module_heading?: string | null;
    voter_login_label?: string | null;
    candidate_reg_label?: string | null;
    candidate_reg_enabled?: boolean | null;
  } | null | undefined;
  phases: PhaseState[];
}

export function RoleSelector({ onSelect, config, phases }: RoleSelectorProps) {
  const isFilingActive = isPhaseActive(phases, 'filing');
  const candidateRegEnabled = config?.candidate_reg_enabled ?? true;
  
  const canRegisterCandidate = isFilingActive && candidateRegEnabled;

  return (
    <div className="space-y-7 text-center">
      <h2 className="text-3xl font-black tracking-tight text-slate-950">
        {config?.auth_module_heading || 'Join the Election'}
      </h2>
      <p className="pb-1 text-sm font-semibold text-slate-500">
        Select your role to continue
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onSelect('user-login')}
          className="group relative w-full overflow-hidden rounded-2xl border border-white/55 bg-[var(--tenant-primary)] px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
          <span className="relative text-sm font-black uppercase tracking-wider text-white">
            {config?.voter_login_label || 'I am a Voter'}
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => onSelect(canRegisterCandidate ? 'candidate-register' : 'candidate-login')}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/70 bg-white/45 px-6 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
            <span className="relative text-sm font-black uppercase tracking-wider text-slate-950 transition-colors group-hover:text-[var(--tenant-primary)]">
              {config?.candidate_reg_label || 'I am a Candidate'}
            </span>
          </button>
          {!canRegisterCandidate && (
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
              Registration closed • Sign-in available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
