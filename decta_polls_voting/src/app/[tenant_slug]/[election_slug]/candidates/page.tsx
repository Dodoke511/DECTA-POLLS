"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

export default function CandidatesListingPage() {
  const { userContext, siteConfig } = useElectionPublic();

  if (userContext?.isVoter && siteConfig?.voter_can_view_candidates === false) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/60">Candidate listing is currently restricted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Meet the Candidates</h1>
        <p className="text-white/60">Browse the verified candidates for this election.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for Candidate Listing Component */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#140B2D]/80 backdrop-blur-md rounded-xl p-6 border border-white/10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 mb-4" />
            <h3 className="text-lg font-bold text-white">Candidate {i}</h3>
            <p className="text-sm text-[var(--tenant-primary)] uppercase tracking-widest mt-1">President</p>
          </div>
        ))}
      </div>
    </div>
  );
}
