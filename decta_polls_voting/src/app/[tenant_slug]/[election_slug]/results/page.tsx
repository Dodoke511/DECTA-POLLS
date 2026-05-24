"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { ResultsPageContainer } from '@/components/results/ResultsPageContainer';
import { Award } from 'lucide-react';

export default function ResultsPage() {
  const { userContext, siteConfig, tenant, election, brandColor } = useElectionPublic();
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  if (userContext?.isCandidate && siteConfig?.candidate_can_view_results === false) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl max-w-md w-full">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.09]" />
          <h2 className="text-2xl font-black text-slate-950 mb-4">Results Not Available</h2>
          <p className="text-slate-600 font-semibold">Candidate access to election results has been restricted by the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-12 sm:px-6">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />

      {/* Visual background decorations for rich depth */}
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] h-96 w-96 rounded-full bg-[var(--tenant-secondary)]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-8">

        {/* Header Title Panel */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 px-8 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.09]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--tenant-secondary)]/35 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl mb-4">
                <Award className="h-4 w-4" />
                Election Completed
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                Election Results
              </h1>
              <p className="mt-2 text-base font-semibold text-slate-600">
                Final certified tallies and winners list.
              </p>
            </div>
          </div>
        </div>

        {/* Results Container Panel */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.05]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />

          <ResultsPageContainer
            tenantSlug={tenant?.slug || ''}
            electionSlug={election?.slug || ''}
            primaryColor={brandColor || '#5D44F8'}
          />
        </div>
      </div>
    </div>
  );
}
