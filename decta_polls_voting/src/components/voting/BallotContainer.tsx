"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StepByStepBallot } from './StepByStepBallot';
import { BallotIntegrityOverlay } from './BallotIntegrityOverlay';
import { useBallotIntegrity } from '@/lib/public-election/ballot-integrity';
import { startBallotSession, submitBallot } from '@/lib/public-election/vote-submission';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

interface BallotContainerProps {
  tenantSlug: string;
  electionSlug: string;
  primaryColor?: string;
  encryptionKeyPublic: string;
  subscriptionTier: string;
}

export function BallotContainer({
  tenantSlug,
  electionSlug,
  primaryColor,
  encryptionKeyPublic,
  subscriptionTier
}: BallotContainerProps) {
  const router = useRouter();
  const { userContext, basePath } = useElectionPublic();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [ballotIds, setBallotIds] = useState<Record<string, string>>({}); // positionId -> ballotId
  const [votingConfig, setVotingConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const integrityStatus = useBallotIntegrity(tenantSlug, electionSlug, sessionId);

  const handleReturnToDashboard = () => {
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

  useEffect(() => {
    async function initBallot() {
      try {
        // 1. Fetch Election Data (Positions, Candidates, Ballots config)
        const dataRes = await fetch(`/api/public/${tenantSlug}/${electionSlug}/vote/data`);
        if (!dataRes.ok) throw new Error('Failed to load ballot data');
        const data = await dataRes.json();

        setPositions(data.positions || []);
        setCandidates(data.candidates || []);
        setVotingConfig(data.votingConfig || {});

        // Map ballot IDs for easy lookup during submission
        const bMap: Record<string, string> = {};
        (data.ballots || []).forEach((b: any) => {
          bMap[b.position_id] = b.id;
        });
        setBallotIds(bMap);

        // 2. Start Session
        const sid = await startBallotSession(tenantSlug, electionSlug);
        setSessionId(sid);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initBallot();
  }, [tenantSlug, electionSlug]);

  const handleSubmit = async (selections: Record<string, any>) => {
    if (!sessionId) return;

    setIsSubmitting(true);
    try {
      await submitBallot(
        tenantSlug,
        electionSlug,
        sessionId,
        selections,
        positions,
        ballotIds,
        encryptionKeyPublic
      );

      // Navigate to confirmation page
      router.push(`/${tenantSlug}/${electionSlug}/vote/confirmation`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    const isAlreadyVoted = error.toLowerCase().includes('already submitted') || 
                           error.toLowerCase().includes('already voted');
    
    if (isAlreadyVoted) {
      return (
        <div className="text-center py-10 px-4 space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Voting Completed</h2>
            <p className="text-sm font-semibold text-slate-650 max-w-md mx-auto leading-relaxed">
              You have already successfully cast your vote in this election! Your ballot has been encrypted and recorded.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReturnToDashboard}
              className="inline-flex items-center justify-center rounded-full bg-[var(--tenant-primary)] px-8 py-3 text-sm font-black text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-lg font-bold text-red-800">Oops! X_X</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <BallotIntegrityOverlay
        status={integrityStatus}
        primaryColor={primaryColor}
        subscriptionTier={subscriptionTier}
      />

      <StepByStepBallot
        positions={positions}
        candidates={candidates}
        votingConfig={votingConfig}
        tenantSlug={tenantSlug}
        electionSlug={electionSlug}
        primaryColor={primaryColor}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
