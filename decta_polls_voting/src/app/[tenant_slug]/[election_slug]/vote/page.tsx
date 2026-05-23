"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { BallotContainer } from '@/components/voting/BallotContainer';
import { Maximize, Minimize } from 'lucide-react';
import Image from 'next/image';

export default function VotePage() {
  const { userContext, phases, election, siteConfig, tenant, brandColor } = useElectionPublic();
  const isVotingActive = isPhaseActive(phases, 'voting');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (!userContext?.isVoter) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/60">This page is for registered voters only.</p>
        </div>
      </div>
    );
  }

  if (!isVotingActive) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="bg-[#140B2D]/80 backdrop-blur-md rounded-xl p-8 border border-white/10 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-2">Voting is Closed</h2>
          <p className="text-white/60">The voting phase is not currently active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F4F4F5] overflow-y-auto py-12 px-6' : 'py-12 px-6'}`}>
      <div className={`mx-auto w-full transition-all duration-300 ${isFullscreen ? 'max-w-7xl' : 'max-w-5xl'}`}>
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-black/10">
          <div className="flex items-center gap-5">
            {Boolean(tenant?.logo_url) && typeof tenant.logo_url === 'string' && (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-black/10 shadow-sm shrink-0 bg-white">
                <Image src={tenant.logo_url as string} alt={(tenant?.organization as string) || 'Logo'} fill className="object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-2 text-black">{(tenant?.organization as string) || 'Tenant'} Election</h1>
              <p className="text-black/60">Please review your choices carefully before submitting.</p>
              <p className="text-black/60">Our system is strict in monitoring screen change/switch tabs. Any suspicious activity will be flagged.</p>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium bg-black/5 hover:bg-black/10 text-black shrink-0"
          >
            {isFullscreen ? (
              <><Minimize size={18} /> Exit Fullscreen</>
            ) : (
              <><Maximize size={18} /> Enter Fullscreen</>
            )}
          </button>
        </div>

        <div 
          className={`bg-white rounded-xl p-8 border border-black/10 shadow-xl transition-all duration-300 ${isFullscreen ? 'min-h-[80vh]' : ''}`}
          style={{ borderTop: `4px solid ${brandColor || '#5D44F8'}` }}
        >
          <BallotContainer
            tenantSlug={tenant?.slug || ''}
            electionSlug={election?.slug || ''}
            primaryColor={brandColor || '#5D44F8'}
            encryptionKeyPublic={(election?.encryption_key_public as string) || ''}
            subscriptionTier={(tenant?.subscription as string) || 'BASIC'}
          />
        </div>
      </div>
    </div>
  );
}
