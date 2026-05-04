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
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 overflow-hidden shadow-[0_20px_50px_rgba(93,68,248,0.1)] relative z-10">
      <div className="p-8">
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
