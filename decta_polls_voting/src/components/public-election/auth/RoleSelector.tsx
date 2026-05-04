import React from 'react';
import { PhaseState, isPhaseActive } from '@/lib/public-election/phase-utils';

interface RoleSelectorProps {
  onSelect: (view: 'candidate-register' | 'user-login') => void;
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
            onClick={() => canRegisterCandidate && onSelect('candidate-register')}
            disabled={!canRegisterCandidate}
            className={`w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 shadow-sm hover:shadow-md ${
              !canRegisterCandidate ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className={`absolute inset-0 bg-slate-200 ${canRegisterCandidate ? 'group-hover:bg-[var(--tenant-primary)]' : ''} transition-colors`} />
            <div className="relative bg-white group-hover:bg-slate-50 px-6 py-4 rounded-xl flex items-center justify-center transition-colors">
              <span className="text-slate-900 font-bold tracking-wider uppercase text-sm group-hover:text-[var(--tenant-primary)] transition-colors">
                {config?.candidate_reg_label || 'I am a Candidate'}
              </span>
            </div>
          </button>
          {!canRegisterCandidate && (
            <p className="text-xs text-red-500 font-medium mt-2">
              Candidate registration is closed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
