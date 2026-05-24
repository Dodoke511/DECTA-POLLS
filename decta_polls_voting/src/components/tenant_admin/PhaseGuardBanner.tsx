'use client';

import React from 'react';
import { Clock, Lock, AlertTriangle, Info } from 'lucide-react';
import { PhaseStatus } from '@/lib/workflow/PhaseResolverService';

interface PhaseGuardBannerProps {
  /** The current phase status */
  phaseStatus: PhaseStatus | null;
  /** The current phase type name for display */
  currentPhaseName?: string;
  /** Whether the page is in the wrong phase entirely */
  isWrongPhase?: boolean;
  /** Custom message override */
  message?: string;
}

export function PhaseGuardBanner({ phaseStatus, currentPhaseName, isWrongPhase, message }: PhaseGuardBannerProps) {
  if (!phaseStatus && !isWrongPhase) return null;

  // Wrong phase takes priority
  if (isWrongPhase && currentPhaseName) {
    return (
      <div className="mx-0 mb-6 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-sky-400">{message || 'Read-Only Mode'}</p>
          <p className="text-xs text-sky-400/60 mt-0.5">
            This section is read-only during the <span className="font-bold capitalize">{currentPhaseName}</span> phase.
          </p>
        </div>
      </div>
    );
  }

  if (phaseStatus === 'for_transition') {
    return (
      <div className="mx-0 mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-400">Waiting for Phase Transition</p>
          <p className="text-xs text-amber-400/60 mt-0.5">
            The current phase has reached its deadline. All actions are temporarily disabled until the phase is advanced.
          </p>
        </div>
      </div>
    );
  }

  if (phaseStatus === 'upcoming') {
    return (
      <div className="mx-0 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-white/30" />
        </div>
        <div>
          <p className="text-sm font-bold text-white/50">Phase Not Started</p>
          <p className="text-xs text-white/30 mt-0.5">
            This phase has not been activated yet. Actions will become available once the phase begins.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
