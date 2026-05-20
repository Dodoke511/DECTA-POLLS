"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';

export default function AppealPage() {
  const { userContext, phases } = useElectionPublic();
  const isAppealActive = isPhaseActive(phases, 'appeal');

  if (!userContext?.isCandidate) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/60">This page is for candidates only.</p>
        </div>
      </div>
    );
  }

  if (!isAppealActive) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="bg-[#140B2D]/80 backdrop-blur-md rounded-xl p-8 border border-white/10 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-2">Appeals Closed</h2>
          <p className="text-white/60">The appeal phase is not currently active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Submit an Appeal</h1>
        <p className="text-white/60">If your application was rejected, you may submit a formal appeal here.</p>
      </div>

      <div className="bg-[#140B2D]/80 backdrop-blur-md rounded-xl p-8 border border-white/10">
        <p className="text-white/60 text-center py-12">
          [Appeal Form Module will be mounted here]
        </p>
      </div>
    </div>
  );
}
