"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StepByStepBallot } from './StepByStepBallot';
import { BallotIntegrityOverlay } from './BallotIntegrityOverlay';
import { useBallotIntegrity } from '@/lib/public-election/ballot-integrity';
import { startBallotSession, submitBallot } from '@/lib/public-election/vote-submission';
import { Loader2 } from 'lucide-react';

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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [ballotIds, setBallotIds] = useState<Record<string, string>>({}); // positionId -> ballotId
  const [votingConfig, setVotingConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const integrityStatus = useBallotIntegrity(tenantSlug, electionSlug, sessionId);

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
