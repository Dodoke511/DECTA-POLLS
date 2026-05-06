"use client";

import React, { useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { ElectionAuthModule } from '@/components/public-election/auth/ElectionAuthModule';

export default function ElectionLandingPage() {
  const { election, siteConfig, userContext, basePath } = useElectionPublic();

  useEffect(() => {
    if (userContext?.isVoter) {
      window.location.href = `${basePath}/dashboard`;
    }
  }, [basePath, userContext]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-20 px-6">
      {/* Background Banner */}
      {siteConfig?.banner_url && (
        <div 
          className="absolute inset-0 z-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${siteConfig.banner_url})` }}
        />
      )}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-white/80 to-white" />

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Column: Hero Content */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight">
            {siteConfig?.public_title || election.title}
          </h1>
          {siteConfig?.tagline && (
            <p className="text-xl text-[var(--tenant-primary)] font-bold tracking-wide uppercase">
              {siteConfig.tagline}
            </p>
          )}
          {siteConfig?.welcome_message && (
            <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
              {siteConfig.welcome_message}
            </p>
          )}
        </div>

        {/* Right Column: Auth Module */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <ElectionAuthModule />
        </div>
      </div>
    </div>
  );
}
