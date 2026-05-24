import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Ban } from 'lucide-react';
import { IntegrityStatus } from '@/lib/public-election/ballot-integrity';

interface BallotIntegrityOverlayProps {
  status: IntegrityStatus;
  primaryColor?: string;
  subscriptionTier?: string;
}

export function BallotIntegrityOverlay({ status, primaryColor = '#e11d48', subscriptionTier = 'BASIC' }: BallotIntegrityOverlayProps) {
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);

  // Set the limit of warnings based on tenant subscription tier
  const maxWarnings = subscriptionTier.toUpperCase() === 'ENTERPRISE' ? 1 :
                      subscriptionTier.toUpperCase() === 'STANDARD' ? 3 : 5;

  // If there are no un-acknowledged warnings, we just show the small toast or nothing.
  if (status.totalWarnings === 0) return null;

  // If they have exceeded or met the max warnings, they are BLOCKED.
  if (status.totalWarnings >= maxWarnings) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Ban className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-2xl font-black text-slate-900">Voting Blocked</h2>
          <p className="mt-4 text-sm font-medium text-slate-600 leading-relaxed">
            Your voting session has been terminated due to repeated integrity violations ({status.totalWarnings}/{maxWarnings} warnings). 
            You are no longer allowed to submit this ballot.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-8 w-full rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If they have an un-acknowledged warning
  if (status.totalWarnings > acknowledgedCount) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-2xl font-black text-slate-900">Session Warning</h2>
          <p className="mt-4 text-sm font-medium text-slate-600 leading-relaxed">
            Please do not leave the ballot screen. Your voting session will be flagged for integrity violations if you leave again.
            <br/><br/>
            <strong>Warning {status.totalWarnings} of {maxWarnings}</strong>
          </p>
          <button
            onClick={() => setAcknowledgedCount(status.totalWarnings)}
            className="mt-8 w-full rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
          >
            Acknowledge and Continue
          </button>
        </div>
      </div>
    );
  }

  // Otherwise, if they acknowledged it, we just show the small warning toast at the bottom to remind them
  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 pointer-events-none">
      <div className="flex items-start gap-4 rounded-2xl border border-amber-200/50 bg-amber-50/95 p-5 shadow-[0_8px_30px_rgba(245,158,11,0.2)] backdrop-blur-md">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-amber-900">Security Warning</h3>
          <p className="mt-1 text-xs font-medium text-amber-700/80">
            Leaving the voting screen ({status.totalWarnings}/{maxWarnings} warnings) is recorded. 
            Exceeding the limit will terminate your session.
          </p>
        </div>
      </div>
    </div>
  );
}
