import React from 'react';
import { PhaseState, isPhaseActive } from '@/lib/public-election/phase-utils';

interface RoleSelectorProps {
  onSelect: (view: 'candidate-register' | 'candidate-login' | 'user-login') => void;
  config: any;
  phases: PhaseState[];
}

export function RoleSelector({ onSelect, config, phases }: RoleSelectorProps) {
  const isFilingActive = isPhaseActive(phases, 'filing');
  const candidateRegEnabled = config?.candidate_reg_enabled ?? true;
  
  const canRegisterCandidate = isFilingActive && candidateRegEnabled;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        {config?.auth_module_heading || 'Join the Election'}
      </h2>
      <p className="text-slate-500 text-sm pb-2">
        Select your role to continue
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onSelect('user-login')}
          className="w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--tenant-primary)] to-[#A78BFA]" />
          <div className="relative bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90 px-6 py-4 rounded-xl flex items-center justify-center transition-colors">
            <span className="text-white font-bold tracking-wider uppercase text-sm">
              {config?.voter_login_label || 'I am a Voter'}
            </span>
          </div>
        </button>

        <div className="relative">
          <button
            onClick={() => onSelect(canRegisterCandidate ? 'candidate-register' : 'candidate-login')}
            className="w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-slate-200 group-hover:bg-[var(--tenant-primary)] transition-colors" />
            <div className="relative bg-white group-hover:bg-slate-50 px-6 py-4 rounded-xl flex items-center justify-center transition-colors">
              <span className="text-slate-900 font-bold tracking-wider uppercase text-sm group-hover:text-[var(--tenant-primary)] transition-colors">
                {config?.candidate_reg_label || 'I am a Candidate'}
              </span>
            </div>
          </button>
          {!canRegisterCandidate && (
            <p className="text-[10px] text-slate-400 font-medium mt-2 flex items-center justify-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
              Registration closed • Sign-in available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
