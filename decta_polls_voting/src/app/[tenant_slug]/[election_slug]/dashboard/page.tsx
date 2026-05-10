"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

export default function VoterDashboardPage() {
  const { userContext, election, siteConfig } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;

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
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--tenant-primary)]">Voter Dashboard</p>
          <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
            Welcome, {userContext.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            You are signed in for {title}. Dashboard content will be added here.
          </p>
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
