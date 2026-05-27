"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { BallotContainer } from '@/components/voting/BallotContainer';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';
import { Maximize, Minimize, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function VotePage() {
  const { userContext, phases, election, siteConfig, tenant, brandColor, basePath } = useElectionPublic();
  const isVotingActive = isPhaseActive(phases, 'voting');
  const router = useRouter();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasConfirmedRules, setHasConfirmedRules] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(true);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isVotingActive || hasVoted) {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Failed to exit fullscreen automatically:', err);
        });
      }
    }
  }, [isVotingActive, hasVoted]);

  useEffect(() => {
    if (userContext?.isVoter && tenant?.slug && election?.slug) {
      fetch(`/api/public/${tenant.slug}/${election.slug}/vote/status`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'already_voted') {
            setHasVoted(true);
          } else {
            setHasVoted(false);
          }
        })
        .catch(err => console.error("Error fetching vote status:", err))
        .finally(() => setLoadingVoteStatus(false));
    } else {
      setLoadingVoteStatus(false);
    }
  }, [userContext, tenant?.slug, election?.slug]);

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

  const handleStartVoting = () => {
    // 1. Confirm rules
    setHasConfirmedRules(true);
    // 2. Proactively trigger fullscreen for security
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen auto-engagement blocked: ${err.message}`);
      });
    }
  };

  const handleGoBack = () => {
    if (userContext?.isCandidate) {
      router.push(`${basePath}/candidate-dashboard`);
    } else {
      router.push(`${basePath}/dashboard`);
    }
  };

  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  if (loadingVoteStatus) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center justify-center gap-4 py-12 px-6">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />
        
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
        <p className="text-slate-500 font-bold animate-pulse">Verifying voting eligibility...</p>
      </div>
    );
  }

  if (!userContext?.isVoter) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center py-12 px-6">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />
        
        <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/65 bg-white/75 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-red-500 shadow-sm backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600 leading-relaxed">
            This page is reserved for registered voters. Please log in with a voter account to cast your ballot.
          </p>
        </div>
      </div>
    );
  }

  if (!isVotingActive) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center py-12 px-6">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

        <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/65 bg-white/75 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-[var(--tenant-primary)] shadow-sm backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Voting is Closed</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600 leading-relaxed">
            The voting phase is not currently active for this election.
          </p>
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center py-12 px-6">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

        <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/65 bg-white/80 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.15)] backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
          
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-955 uppercase tracking-tight">Voting Completed</h2>
          <p className="mt-2 text-sm font-semibold text-slate-650 leading-relaxed">
            You have already successfully cast your vote in this election! Your ballot has been encrypted, finalized, and safely recorded.
          </p>
          <div className="mt-6">
            <button
              onClick={handleGoBack}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--tenant-primary)] py-3.5 px-8 text-sm font-black text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-voting Rules and Security Confirmation UI Buffer
  if (!hasConfirmedRules) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden py-12 px-6 flex items-center justify-center">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />
        
        <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/65 bg-white/80 p-6 sm:p-10 shadow-[0_35px_110px_rgba(15,23,42,0.15)] backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
          <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--tenant-secondary)]/25 bg-gradient-to-br from-[var(--tenant-primary)]/10 via-[var(--tenant-third)]/15 to-[var(--tenant-secondary)]/20 text-[var(--tenant-primary)] shadow-sm">
                <ShieldCheck className="h-7 w-7 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--tenant-primary)]">Security Pre-Flight</p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">VOTING RULES & INTEGRITY</h1>
              </div>
            </div>

            <div className="border-t border-slate-200/50 pt-6">
              <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                Before entering the ballot, please review the rules below carefully. Our portal enforces strict monitoring to ensure the integrity of the election.
              </p>
            </div>

            <div className="space-y-4 bg-slate-50/70 border border-slate-100 rounded-2xl p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Strict Guidelines</h3>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold mt-0.5">1</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    <strong className="text-slate-955">No Window or Tab Switching:</strong> Switching tabs, blurring the window, or exiting browser focus is tracked. Leaving the screen will flag your session.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold mt-0.5">2</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    <strong className="text-slate-955">Automated Termination:</strong> Triggering integrity violations beyond the allowed warnings limit will permanently terminate and block your voting session.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold mt-0.5">3</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    <strong className="text-slate-955">Fullscreen Mode:</strong> Fullscreen mode is triggered upon entry to lock in your session and prevent accidental blur deviations.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold mt-0.5">4</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    <strong className="text-slate-955">No Screenshots:</strong> Taking screenshots (PrintScreen, Snip Tool, or capturing hotkeys) steals window focus from the browser, which will immediately trigger an integrity warning.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold mt-0.5">5</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    <strong className="text-slate-955">Review Candidates Carefully:</strong> You can only submit a ballot once. Review all selected candidates before submitting your final vote.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-3 border-t border-slate-200/50 pt-6">
              <button
                type="button"
                onClick={() => setAgreedToRules(!agreedToRules)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${agreedToRules ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white shadow-sm shadow-[var(--tenant-primary)]/30' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
                aria-label="Agree to guidelines"
              >
                {agreedToRules && <CheckCircle2 className="h-4 w-4" />}
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-slate-700 leading-relaxed select-none cursor-pointer" onClick={() => setAgreedToRules(!agreedToRules)}>
                I have read and explicitly agree to follow all voting guidelines, integrity tracking policies, and fullscreen requirement.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="w-full sm:w-1/3 rounded-2xl py-4 text-sm font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all focus:outline-none flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleStartVoting}
                disabled={!agreedToRules}
                className={`flex-1 rounded-2xl py-4 text-sm font-black text-white shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 ${agreedToRules ? 'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90 hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'bg-slate-300 cursor-not-allowed opacity-60'}`}
              >
                Start Voting Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-[calc(100vh-80px)] overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto py-12 px-6' : 'py-12 px-6'}`}>
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.10]" />

      <div className={`relative mx-auto w-full transition-all duration-300 ${isFullscreen ? 'max-w-7xl' : 'max-w-5xl'}`}>
        
        {/* Header Glassmorphism Card */}
        <div className="mb-8 overflow-hidden rounded-[30px] border border-white/65 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="h-1.5 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              {Boolean(tenant?.logo_url) && typeof tenant.logo_url === 'string' && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/60 shadow-sm shrink-0 bg-white/80 backdrop-blur-md">
                  <Image src={tenant.logo_url as string} alt={(tenant?.organization as string) || 'Logo'} fill className="object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Voting Portal</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{(tenant?.organization as string) || 'Tenant'} Election</h1>
                <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  Please review your choices carefully before submitting.
                </p>
                <p className="mt-1 text-xs font-bold text-red-500/90 leading-relaxed flex items-center gap-1.5">
                  ⚠️ Our system is strict in monitoring screen change/switch tabs. Any suspicious activity will be flagged.
                </p>
              </div>
            </div>

            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur-md transition hover:border-[var(--tenant-secondary)] hover:bg-white/90 hover:text-[var(--tenant-primary)] shrink-0 self-stretch md:self-auto justify-center"
            >
              {isFullscreen ? (
                <><Minimize size={16} /> Exit Fullscreen</>
              ) : (
                <><Maximize size={16} /> Enter Fullscreen</>
              )}
            </button>
          </div>
        </div>

        {/* Ballot Container Glassmorphism Card */}
        <div 
          className={`relative overflow-hidden rounded-[28px] border border-white/65 bg-white/80 p-6 sm:p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition duration-300 ${isFullscreen ? 'min-h-[80vh]' : ''}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.04]" />
          
          <div className="relative">
            <BallotContainer
              tenantSlug={tenant?.slug || ''}
              electionSlug={election?.slug || ''}
              primaryColor={brandColor || '#5D44F8'}
              encryptionKeyPublic={(election?.encryption_key_public as string) || ''}
              subscriptionTier={(tenant?.subscription as string) || 'BASIC'}
            />
          </div>
        </div>

        {/* If in fullscreen, render a beautifully blended matching footer at the bottom of the container */}
        {isFullscreen && (
          <div className="mt-8 border-t border-slate-200/30 pt-6 pb-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-slate-500">
              <p className="text-xs font-bold">
                &copy; {new Date().getFullYear()} {tenant.organization || tenant.name}. All rights reserved.
              </p>
              <p className="text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest text-slate-500/80">
                Powered by <span className="text-slate-600">Decta Polls</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
