"use client";

import React, { useState } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { RoleSelector } from './RoleSelector';
import { CandidateRegistrationFlow } from './CandidateRegistrationFlow';
import { ElectionLoginFlow } from './ElectionLoginFlow';

export function ElectionAuthModule() {
  const { siteConfig, phases } = useElectionPublic();
  const [view, setView] = useState<'select' | 'candidate-register' | 'candidate-login' | 'user-login'>('select');

  return (
    <div className="relative z-10 mx-auto w-full max-w-md overflow-hidden rounded-[34px] border border-white/65 bg-white/40 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[var(--tenant-primary)]/12 blur-3xl" />
      <div className="relative p-8 sm:p-10">
        {view === 'select' && (
          <RoleSelector 
            onSelect={setView} 
            config={siteConfig} 
            phases={phases} 
          />
        )}
        
        {view === 'candidate-register' && (
          <CandidateRegistrationFlow 
            onBack={() => setView('select')} 
            onSwitchToLogin={() => setView('candidate-login')}
          />
        )}

        {view === 'candidate-login' && (
          <ElectionLoginFlow 
            role="Candidate"
            onBack={() => setView('select')} 
          />
        )}

        {view === 'user-login' && (
          <ElectionLoginFlow 
            role="Voter"
            onBack={() => setView('select')} 
          />
        )}
      </div>
    </div>
  );
}
