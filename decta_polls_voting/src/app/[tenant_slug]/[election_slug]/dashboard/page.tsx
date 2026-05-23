"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { AlertCircle, BadgeCheck, CalendarDays, CheckCircle2, Fingerprint, Home, UserRound } from 'lucide-react';
import { isPhaseActive, getActivePhase } from '@/lib/public-election/phase-utils';

interface DashboardCandidate {
  id: string;
  name?: string;
  displayName?: string;
  user?: {
    name?: string;
  };
  voteCount?: number;
}

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.09]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-5rem] h-48 w-48 rounded-full bg-[var(--tenant-secondary)]/20 blur-3xl" />
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[26px] border p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.16)] ${accent ? 'border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 text-slate-900' : 'border-white/65 bg-white/45 text-slate-800'}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-xl ${accent ? 'border-[var(--tenant-secondary)]/35 bg-gradient-to-br from-[var(--tenant-primary)]/15 via-[var(--tenant-third)]/20 to-[var(--tenant-secondary)]/25 text-[var(--tenant-primary)]' : 'border-[var(--tenant-secondary)]/25 bg-white/55 text-slate-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 truncate text-lg font-black leading-none text-slate-900" title={value}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function VoterDashboardPage() {
  const { userContext, election, siteConfig, phases, tenant } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const [currentTime, setCurrentTime] = useState<string>("");
  const [candidates, setCandidates] = useState<DashboardCandidate[]>([]);

  // Format real-time clock: "20:40 • Monday, May 11, 2026"
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dayNum = now.getDate();
      const year = now.getFullYear();

      setCurrentTime(`${timeStr} • ${dayName}, ${monthName} ${dayNum}, ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

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

  if (!userContext?.isVoter) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-6 py-12 text-center">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl animate-pulse" />
        <div className="relative mx-auto flex min-h-[calc(100vh-176px)] max-w-md items-center justify-center">
          <section className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
            <AlertCircle className="mx-auto mb-4 h-11 w-11 text-[var(--tenant-primary)]" />
            <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">This dashboard is for registered voters only.</p>
          </section>
        </div>
      </div>
    );
  }

  // Phase calculations
  const safePhases = phases || [];
  const enabledPhases = safePhases
    .filter(p => p.is_enabled)
    .sort((a, b) => a.phase_index - b.phase_index);

  const activePhase = getActivePhase(safePhases);

  const activePhaseIndexInEnabled = activePhase
    ? enabledPhases.findIndex(p => p.id === activePhase.id)
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

  // Candidate tallies to display if voting is active
  const totalVotes = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
  const displayedCandidates = candidates.length > 0
    ? [...candidates]
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
      .slice(0, 3)
      .map((c, i) => {
        const rawPercentage = totalVotes > 0 ? ((c.voteCount || 0) / totalVotes) * 100 : 0;
        return {
          name: c.displayName || c.name || c.user?.name || `Candidate ${i + 1}`,
          percentage: Math.round(rawPercentage),
          voteCount: c.voteCount || 0
        };
      })
    : [
      { name: "Candidate 1", percentage: 0, voteCount: 0 },
      { name: "Candidate 2", percentage: 0, voteCount: 0 },
      { name: "Candidate 3", percentage: 0, voteCount: 0 }
    ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 pt-2 pb-10 sm:px-6">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] h-96 w-96 rounded-full bg-[var(--tenant-third)]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-8">

        {/* Welcome Section */}
        <GlassPanel className="px-8 py-4 sm:px-10 sm:py-6 w-full flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 w-full">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/65 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
              <Home className="h-4 w-4" />
              Voter Dashboard
            </div>
            {currentTime && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/55 px-4 py-2 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-xl">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--tenant-primary)] animate-pulse" />
                {currentTime}
              </div>
            )}
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl lg:text-6xl w-full">
            Welcome, {userContext.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600">
            You are signed in for {title}. Your election access, account type, and readiness status are shown below.
          </p>

          {/* Live Election Overview Section */}
          <div className="mt-8 border-t border-white/20 pt-8 space-y-5 w-full self-stretch flex flex-col" style={{ width: '100%', minWidth: '100%' }}>
            <div className="px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--tenant-primary)]">Public Election Dashboard</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 tracking-tight md:text-3xl">Live Election Overview</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 w-full self-stretch">
              {/* Live Election Status Card */}
              <div className="flex-1 relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)] flex flex-col justify-between min-h-[145px]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.07]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Election Status</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200/50 shadow-sm">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-4 relative">
                  <h3 className="text-xl font-black text-slate-950 leading-snug truncate" title={title}>{title}</h3>
                  <p className="mt-3 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    Public page is available.
                  </p>
                </div>
              </div>

              {/* Current Phase Card */}
              <div className="flex-1 relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)] flex flex-col justify-between min-h-[145px]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.07]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Phase</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200/50 shadow-sm">
                    LIVE
                  </span>
                </div>
                <div className="mt-4 relative">
                  <h3 className="text-xl font-black text-slate-950 flex items-baseline">
                    {activePhaseLabel}
                    {phaseIndexLabel && (
                      <span className="ml-2 text-sm font-bold text-slate-400">{phaseIndexLabel}</span>
                    )}
                  </h3>

                  <div className="mt-4">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100/80 border border-slate-200/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)] shadow-[0_0_12px_rgba(93,68,248,0.3)] transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vote Tallies Card */}
            <div className="relative overflow-hidden rounded-[26px] border border-white/65 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition hover:shadow-[0_26px_65px_rgba(15,23,42,0.1)] w-full">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.06]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vote Tallies</p>

              {isVotingPhaseActive ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-3 relative">
                  {displayedCandidates.map((cand, index) => (
                    <div key={index} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition duration-300 hover:shadow-md hover:border-[var(--tenant-primary)]/20">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-700 truncate max-w-[130px]" title={cand.name}>{cand.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">{cand.voteCount} {cand.voteCount === 1 ? 'vote' : 'votes'}</span>
                          <span className="text-[var(--tenant-primary)]">{cand.percentage}%</span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)] shadow-[0_0_8px_rgba(93,68,248,0.25)] transition-all duration-500"
                          style={{ width: `${cand.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                  <p className="text-sm font-extrabold text-slate-700">
                    Vote tally appears when Voting phase is active.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    A visual chart will automatically appear here once the election enters voting.
                  </p>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* 3 Core Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard icon={CalendarDays} label="Election" value={title} />
          <StatCard icon={Fingerprint} label="Account" value={userContext.userType.toUpperCase()} />
          <StatCard icon={CheckCircle2} label="Status" value="Ready" accent />
        </div>

        {/* Voter Session Active Panel */}
        <GlassPanel className="p-8 sm:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 relative">
            <div className="lg:col-span-2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/65 bg-gradient-to-br from-[var(--tenant-primary)]/15 via-[var(--tenant-third)]/20 to-[var(--tenant-secondary)]/25 text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Be the Change</p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Your voter session is active</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Use the navigation above to view candidates, open the ballot when voting is active, and check published results when the election reaches the results phase.
              </p>
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-[26px] border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Summary</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/45 px-4 py-3">
                    <span className="text-sm font-bold text-slate-500">Election</span>
                    <span className="text-right text-sm font-black text-slate-900 truncate max-w-[170px]" title={title}>{title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/45 px-4 py-3">
                    <span className="text-sm font-bold text-slate-500">Role</span>
                    <span className="text-sm font-black text-slate-900 uppercase">{userContext.userType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
