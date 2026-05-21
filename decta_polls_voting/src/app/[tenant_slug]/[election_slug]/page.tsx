"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { ElectionAuthModule } from '@/components/public-election/auth/ElectionAuthModule';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { Sparkles } from 'lucide-react';
import { isPhaseActive, getActivePhase } from '@/lib/public-election/phase-utils';

interface DashboardCandidate {
  id: string;
  name?: string;
  displayName?: string;
  user?: {
    name?: string;
  };
}

export default function ElectionLandingPage() {
  const { tenant, election, siteConfig, userContext, phases } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const [candidates, setCandidates] = useState<DashboardCandidate[]>([]);

  // Fetch candidates to show real candidate names in vote tallies if voting is active
  useEffect(() => {
    if (tenant?.slug && election?.slug) {
      fetch(`/api/public/${tenant.slug}/${election.slug}/candidates`)
        .then(res => res.json())
        .then(data => {
          if (data.candidates && Array.isArray(data.candidates)) {
            setCandidates(data.candidates);
          }
        })
        .catch(err => console.error("Failed to fetch candidates:", err));
    }
  }, [tenant?.slug, election?.slug]);

  // Phase logic
  const safePhases = phases || [];
  const enabledPhases = safePhases
    .filter((p: any) => p.is_enabled)
    .sort((a: any, b: any) => a.phase_index - b.phase_index);

  const activePhase = getActivePhase(safePhases);

  const activePhaseIndexInEnabled = activePhase
    ? enabledPhases.findIndex((p: any) => p.id === activePhase.id)
    : -1;

  const totalPhases = enabledPhases.length;
  const phaseIndexLabel = activePhaseIndexInEnabled >= 0
    ? `${activePhaseIndexInEnabled + 1}/${totalPhases}`
    : "";

  const getPhaseDisplayName = (type: string) => {
    if (!type) return "Unknown";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  const activePhaseLabel = activePhase ? getPhaseDisplayName(activePhase.phase_type) : "No active phase";

  const progressPercent = activePhaseIndexInEnabled >= 0
    ? ((activePhaseIndexInEnabled + 1) / totalPhases) * 100
    : 0;

  const isVotingPhaseActive = isPhaseActive(safePhases, 'voting');

  const displayedCandidates = (candidates && candidates.length > 0)
    ? candidates.slice(0, 3).map((c: any, i: number) => ({
      name: c.displayName || c.name || c.user?.name || `Candidate ${i + 1}`,
      percentage: [72, 51, 34][i] || 25
    }))
    : [
      { name: "Candidate 1", percentage: 72 },
      { name: "Candidate 2", percentage: 51 },
      { name: "Candidate 3", percentage: 34 }
    ];

  if (userContext) {
    return (
      <div className="relative min-h-[calc(100vh-136px)] overflow-hidden px-4 py-8 sm:px-6 lg:py-10">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none absolute left-[-8rem] top-20 z-0 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[-7rem] z-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

        <div className="relative z-10 mx-auto flex flex-col min-h-[calc(100vh-216px)] max-w-6xl items-center justify-center gap-8 py-12">
          <section className="relative w-full overflow-hidden rounded-[34px] border border-white/65 bg-white/40 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />

            <div className="relative max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                Welcome Home
              </p>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
                Hi, {userContext.name}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                You are already signed in as a {userContext.userType.toLowerCase()} for {title}.
              </p>
            </div>
          </section>

          {/* Dashboard Section (Glass Theme) */}
          <section className="relative w-full overflow-hidden rounded-[34px] border border-white/65 bg-white/40 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-60 w-60 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
            
            <div className="relative z-10 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tenant-primary)]">Public Election Dashboard</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 tracking-tight md:text-3xl">Live Election Overview</h2>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Live Election Status Card */}
              <div className="relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Election Status</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-950 leading-snug truncate" title={title}>{title}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Public page is available.
                  </p>
                </div>
              </div>

              {/* Current Phase Card */}
              <div className="relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Phase</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    LIVE
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-950 flex items-baseline">
                    {activePhaseLabel}
                    {phaseIndexLabel && (
                      <span className="ml-2 text-sm font-bold text-slate-400">{phaseIndexLabel}</span>
                    )}
                  </h3>

                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-red-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vote Tallies Card */}
              <div className="relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vote Tallies</p>

                {isVotingPhaseActive ? (
                  <div className="mt-4 grid gap-3">
                    {displayedCandidates.map((cand, index) => (
                      <div key={index} className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className="text-slate-700 truncate max-w-[130px]" title={cand.name}>{cand.name}</span>
                          <span className="text-[var(--tenant-primary)]">{cand.percentage}%</span>
                        </div>
                        <div className="mt-2.5 h-2 w-full rounded-full bg-white/80 overflow-hidden border border-white/50">
                          <div
                            className="h-full rounded-full bg-[var(--tenant-primary)] transition-all duration-500"
                            style={{ width: `${cand.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border-2 border-dashed border-white/60 bg-white/40 p-5 text-center">
                    <p className="text-sm font-bold text-slate-700">
                      Vote tally appears when Voting phase is active.
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      A visual chart will automatically appear here once the election enters voting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-136px)] overflow-hidden px-4 py-8 sm:px-6 lg:py-10">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none absolute left-[-8rem] top-20 z-0 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] z-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-216px)] w-full max-w-7xl grid-cols-1 items-center gap-7 lg:grid-cols-[1.05fr_0.95fr] xl:gap-10">
        <div className="relative overflow-hidden rounded-[34px] border border-white/65 bg-white/35 p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
          <div className="relative">
            <p className="mb-5 inline-flex rounded-full border border-white/65 bg-white/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
              Election Home
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
              {title}
            </h1>
            {siteConfig?.tagline && (
              <p className="mt-8 text-xl font-black uppercase tracking-wide text-[var(--tenant-primary)]">
                {siteConfig.tagline}
              </p>
            )}
            {siteConfig?.welcome_message && (
              <p className="mt-6 max-w-2xl whitespace-pre-wrap text-lg font-semibold leading-8 text-slate-600">
                {siteConfig.welcome_message}
              </p>
            )}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <ElectionAuthModule />
        </div>
      </div>
    </div>
  );
}
