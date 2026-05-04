"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

export default function ResultsPage() {
  const { userContext, siteConfig } = useElectionPublic();

  if (userContext?.isCandidate && siteConfig?.candidate_can_view_results === false) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Results Not Available</h2>
          <p className="text-white/60">Candidate access to election results has been restricted by the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Election Results</h1>
        <p className="text-white/60">Final results for this election.</p>
      </div>

      <div className="bg-[#140B2D]/80 backdrop-blur-md rounded-xl p-8 border border-white/10">
        <p className="text-white/60 text-center py-12">
          [Results Module will be mounted here]
        </p>
      </div>
    </div>
  );
}
