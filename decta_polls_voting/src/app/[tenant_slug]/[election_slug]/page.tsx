"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { ElectionAuthModule } from '@/components/public-election/auth/ElectionAuthModule';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { Sparkles } from 'lucide-react';

export default function ElectionLandingPage() {
  const { election, siteConfig, userContext } = useElectionPublic();
  const title = siteConfig?.public_title || election.title;
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  if (userContext) {
    return (
      <div className="relative min-h-[calc(100vh-136px)] overflow-hidden px-4 py-8 sm:px-6 lg:py-10">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none absolute left-[-8rem] top-20 z-0 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[-7rem] z-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-216px)] max-w-6xl items-center">
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
