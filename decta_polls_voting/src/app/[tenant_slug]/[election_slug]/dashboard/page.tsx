"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { AlertCircle, BadgeCheck, CalendarDays, CheckCircle2, Fingerprint, Home, UserRound } from 'lucide-react';

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
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
    <div className={`relative overflow-hidden rounded-[26px] border p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_65px_rgba(15,23,42,0.16)] ${accent ? 'border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10' : 'border-white/65 bg-white/45'}`}>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function VoterDashboardPage() {
  const { userContext, election, siteConfig } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;
  const electionLabel = siteConfig?.tagline || 'Election Portal';

  if (!userContext?.isVoter) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_42%,#fff7f7_100%)] px-6 py-12 text-center">
        <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
        <div className="mx-auto flex min-h-[calc(100vh-176px)] max-w-md items-center justify-center">
          <GlassPanel className="p-10">
            <AlertCircle className="mx-auto mb-4 h-11 w-11 text-[var(--tenant-primary)]" />
            <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">This dashboard is for registered voters only.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_42%,#fff7f7_100%)] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <GlassPanel className="p-6 sm:p-8">
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
                <Home className="h-4 w-4" />
                Voter Dashboard
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Welcome, {userContext.name}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                You are signed in for {title}. Your election access, account type, and readiness status are shown below.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/65 bg-white/45 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:min-w-72">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Signed In As</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/65 bg-white/55 text-[var(--tenant-primary)] shadow-sm">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-slate-950">{userContext.name}</p>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{userContext.userType}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={CalendarDays} label="Election" value={title} />
          <StatCard icon={Fingerprint} label="Account" value={userContext.userType} />
          <StatCard icon={CheckCircle2} label="Status" value="Ready" accent />
        </section>

        <GlassPanel className="mt-6 p-6 sm:p-8">
          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/65 bg-white/55 text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">{electionLabel}</p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Your voter session is active</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Use the navigation above to view candidates, open the ballot when voting is active, and check published results when the election reaches the results phase.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Summary</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/45 px-4 py-3">
                  <span className="text-sm font-bold text-slate-500">Election</span>
                  <span className="text-right text-sm font-black text-slate-900">{title}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/45 px-4 py-3">
                  <span className="text-sm font-bold text-slate-500">Role</span>
                  <span className="text-sm font-black text-slate-900">{userContext.userType}</span>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
