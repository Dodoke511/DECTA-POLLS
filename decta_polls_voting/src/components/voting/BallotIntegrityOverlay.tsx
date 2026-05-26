import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertTriangle, Ban } from 'lucide-react';
import { IntegrityStatus } from '@/lib/public-election/ballot-integrity';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

interface BallotIntegrityOverlayProps {
  status: IntegrityStatus;
  primaryColor?: string;
  subscriptionTier?: string;
}

export function BallotIntegrityOverlay({ status, primaryColor = '#e11d48', subscriptionTier = 'BASIC' }: BallotIntegrityOverlayProps) {
  const { userContext, basePath } = useElectionPublic();
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set the limit of warnings based on tenant subscription tier
  const maxWarnings = subscriptionTier.toUpperCase() === 'ENTERPRISE' ? 1 :
                      subscriptionTier.toUpperCase() === 'STANDARD' ? 3 : 5;

  if (status.totalWarnings === 0) return null;
  if (!mounted) return null;

  const handleReturnToDashboard = () => {
    // Exit fullscreen if currently active to restore normal screen view
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen on redirect:', err);
      });
    }

    if (userContext?.isCandidate) {
      window.location.href = `${basePath}/candidate-dashboard`;
    } else if (userContext?.isVoter) {
      window.location.href = `${basePath}/dashboard`;
    } else {
      window.location.href = basePath || '/';
    }
  };

  const content = (
    <>
      {status.totalWarnings >= maxWarnings ? (
        // Terminated locked terminal covering the ENTIRE viewport (whole damn screen)
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white p-6 sm:p-12 select-none w-screen h-screen">
          <div className="pointer-events-none absolute inset-0 bg-slate-950" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,rgba(0,0,0,0)_70%)]" />
          
          <div className="relative w-full max-w-xl text-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
              <Ban className="h-12 w-12" />
            </div>
            
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Security Breach Detected</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">VOTING SESSION BLOCKED</h2>
            </div>

            <div className="rounded-[28px] border border-red-500/20 bg-red-950/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <p className="text-base sm:text-lg font-medium text-slate-350 leading-relaxed">
                Your voting access has been permanently terminated due to repeated security/integrity violations. 
              </p>
              <div className="mt-5 flex items-center justify-center gap-4 text-xs font-black uppercase tracking-wider text-red-400">
                <span className="rounded-full bg-red-500/10 px-3 py-1 border border-red-500/25">Warnings: {status.totalWarnings}</span>
                <span>•</span>
                <span className="rounded-full bg-slate-800 px-3 py-1 border border-slate-700">Allowed Limit: {maxWarnings}</span>
              </div>
              <p className="mt-5 text-xs font-semibold text-slate-550 leading-relaxed">
                Any attempt to alter or bypass tab/window monitoring has been recorded and flagged to the election committee.
              </p>
            </div>

            <button
              onClick={handleReturnToDashboard}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-black text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : status.totalWarnings > acknowledgedCount ? (
        // Warnings overlay card covering the ENTIRE viewport (whole damn screen)
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-955/80 p-4 backdrop-blur-md w-screen h-screen">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-bounce">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">Integrity Warning</h2>
            <p className="mt-4 text-sm font-medium text-slate-355 leading-relaxed">
              Please do not leave the ballot screen. Your voting session will be flagged for integrity violations if you leave again.
              <br/><br/>
              <span className="inline-block rounded-full bg-amber-500/15 border border-amber-500/35 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                Warning {status.totalWarnings} of {maxWarnings}
              </span>
            </p>
            <button
              onClick={() => setAcknowledgedCount(status.totalWarnings)}
              className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm font-black text-slate-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Acknowledge and Continue
            </button>
          </div>
        </div>
      ) : (
        // Floating bottom toast warning (doesn't block screen click events, just prompts)
        <div className="fixed bottom-6 left-1/2 z-[9997] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 pointer-events-none">
          <div className="flex items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-955/80 p-5 shadow-[0_8px_30px_rgba(245,158,11,0.2)] backdrop-blur-md pointer-events-auto">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-200">Security Warning</h3>
              <p className="mt-1 text-xs font-medium text-amber-300/80 leading-relaxed">
                Leaving the voting screen ({status.totalWarnings}/{maxWarnings} warnings) is recorded. 
                Exceeding the limit will terminate and block your session.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
