"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { getActivePhase } from '@/lib/public-election/phase-utils';

export default function VoterDashboardPage() {
  const { userContext, election, siteConfig, phases } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateText = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const enabledPhases = phases.filter((phase) => phase.is_enabled);
  const activePhase = getActivePhase(phases);
  const currentPhaseLabel = activePhase
    ? activePhase.phase_type.charAt(0).toUpperCase() + activePhase.phase_type.slice(1).toLowerCase()
    : 'Waiting to start';
  const currentPhaseProgress = activePhase
    ? `${activePhase.phase_index + 1}/${Math.max(enabledPhases.length, 1)}`
    : `0/${Math.max(enabledPhases.length, 1)}`;
  const electionIsLive = String(election.status || '').toUpperCase() === 'ACTIVE';

  if (!userContext?.isVoter) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">This dashboard is for registered voters only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 px-6 py-2">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--tenant-primary)]">Voter Dashboard</p>
          <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
            Welcome, {userContext.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            You are signed in for {title}. Dashboard content will be added here.
          </p>
          <p className="mt-2 text-lg font-bold text-slate-700">
            {timeText} &middot; {dateText}
          </p>

          <section className="mt-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Public Election Dashboard</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Live Election Overview</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Live Election Status</p>
                    <p className="mt-3 text-xl font-black text-slate-950">{title}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">Public page is available.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${electionIsLive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {electionIsLive ? 'Active' : String(election.status || 'Pending')}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Current Phase</p>
                    <p className="mt-3 text-xl font-black text-slate-950">
                      {currentPhaseLabel} <span className="text-base text-slate-500">{currentPhaseProgress}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">
                    Live
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--tenant-primary)] transition-all"
                    style={{
                      width: `${activePhase && enabledPhases.length > 0 ? ((activePhase.phase_index + 1) / enabledPhases.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Vote Tallies</p>
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Vote tally appears when Voting phase is active.</p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  A visual chart will automatically appear here once the election enters voting.
                </p>
              </div>
            </div>
          </section>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Election</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">{title}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Account</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">{userContext.userType}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Status</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">Ready</p>
          </div>
        </section>
      </div>
    </div>
  );
}
