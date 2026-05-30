"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { PhaseStatusBadge } from "@/components/tenant_admin/PhaseStatusBadge";
import { PhaseStatus } from "@/lib/workflow/PhaseResolverService";
import { isSubscriptionExpiringSoon, isSubscriptionRestricted } from '@/lib/subscription-limits';

type ElectionSummary = {
  id: string;
  title: string;
  slug?: string;
  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | string;
};

const phaseOrder = ["Filing", "Screening", "Appeal", "Publication", "Voting", "Results"];

function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

import { TimeWidget } from "@/components/tenant_admin/TimeWidget";

interface LiveElectionDetails {
  election: ElectionSummary;
  currentPhaseLabel: string;
  currentPhaseStatus: PhaseStatus | null;
  phaseDeadline: string | null;
  candidates: any[];
}

interface CandidateWithPosition {
  id: string;
  name?: string;
  displayName?: string;
  voteCount?: number;
  position?: string | null;
  user?: {
    name?: string;
  };
}

const getCandidatesByPosition = (candidatesList: CandidateWithPosition[], totalUsers: number) => {
  const groups: Record<string, CandidateWithPosition[]> = {};
  candidatesList.forEach((c) => {
    const pos = c.position || "General";
    if (!groups[pos]) {
      groups[pos] = [];
    }
    groups[pos].push(c);
  });

  const result: { position: string; candidates: any[] }[] = [];
  Object.keys(groups).forEach((pos) => {
    const sorted = [...groups[pos]]
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
      .map((c, i) => {
        const rawPercentage = totalUsers > 0 ? ((c.voteCount || 0) / totalUsers) * 100 : 0;
        return {
          id: c.id,
          name: c.displayName || c.name || c.user?.name || `Candidate ${i + 1}`,
          percentage: Math.round(rawPercentage),
          voteCount: c.voteCount || 0,
        };
      });
    result.push({
      position: pos,
      candidates: sorted,
    });
  });

  return result.sort((a, b) => a.position.localeCompare(b.position));
};

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [liveElectionsData, setLiveElectionsData] = useState<LiveElectionDetails[]>([]);
  const [userLimits, setUserLimits] = useState<{ currentCount: number, limit: number | null } | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [subscriptionDaysUntilExpiry, setSubscriptionDaysUntilExpiry] = useState<number | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const random = params.get('random');
    const storedSupabaseToken = sessionStorage.getItem('supabaseToken');

    // If we have a token in params, restore sessionStorage for continued access
    if (random) {
      sessionStorage.setItem('tenantToken', random);
      setToken(random);
    }

    // If we still don't have a Supabase token, try to get it from params or storage
    if (!storedSupabaseToken && params.get('token')) {
      sessionStorage.setItem('supabaseToken', params.get('token')!);
    }

    setToken((prev) => prev || sessionStorage.getItem('tenantToken'));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const tenantId = sessionStorage.getItem("tenantUserId");
      if (!tenantId) {
        setDashboardLoading(false);
        return;
      }

      try {
        const electionsRes = await fetch(`/api/get_tenant_elections?tenantId=${tenantId}`);
        const electionsData = await electionsRes.json();
        const elections: ElectionSummary[] = electionsData?.elections ?? [];
        const activeElections = elections.filter((e) => e.status === "ACTIVE" || e.status === "PUBLISHED");

        setTenantSlug(electionsData?.tenantSlug || null);

        if (activeElections.length > 0) {
          const detailsList = await Promise.all(activeElections.map(async (live) => {
            let currentPhaseLabel = "No phase is currently active";
            let currentPhaseStatus: PhaseStatus | null = null;
            let phaseDeadline: string | null = null;
            let candidates: any[] = [];

            try {
              const phaseRes = await fetch(`/api/workflow/current_phase?electionId=${live.id}`);
              if (phaseRes.ok) {
                const phaseData = await phaseRes.json();
                if (phaseData?.phase_type) {
                  currentPhaseLabel = phaseData.phase_type.charAt(0).toUpperCase() + phaseData.phase_type.slice(1);
                  currentPhaseStatus = phaseData.status || 'active';
                  phaseDeadline = phaseData.deadline || null;
                }
              }
            } catch (err) {
              console.error("Failed to fetch phase for election:", live.id, err);
            }

            if (electionsData?.tenantSlug && live.slug) {
              try {
                const candRes = await fetch(`/api/public/${electionsData.tenantSlug}/${live.slug}/candidates`);
                if (candRes.ok) {
                  const candData = await candRes.json();
                  if (candData.candidates && Array.isArray(candData.candidates)) {
                    candidates = candData.candidates;
                  }
                }
              } catch (err) {
                console.error("Failed to fetch candidates:", err);
              }
            }

            return {
              election: live,
              currentPhaseLabel,
              currentPhaseStatus,
              phaseDeadline,
              candidates,
            };
          }));
          setLiveElectionsData(detailsList);
        } else {
          setLiveElectionsData([]);
        }

        const limitsRes = await fetch(`/api/get_tenant_user_limits?tenantId=${tenantId}`);
        if (limitsRes.ok) {
          const limitsData = await limitsRes.json();
          setUserLimits(limitsData);
        }

        const subscriptionRes = await fetch(`/api/get_tenant_subscription?tenantId=${tenantId}`);
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          setSubscriptionPlan(subscriptionData.subscription ?? null);
          setSubscriptionExpiresAt(subscriptionData.subscription_expires_at ?? null);
          setSubscriptionDaysUntilExpiry(subscriptionData.days_until_expiry ?? null);
          setIsRestricted(isSubscriptionRestricted(subscriptionData.subscription, subscriptionData.subscription_expires_at));
        }
      } catch (error) {
        console.error("Failed to load dashboard details:", error);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (!loading) {
      loadDashboardData();
    }
  }, [loading]);

  const isPending = subscriptionPlan === 'PENDING';
  const shouldShowExpiryBanner = isSubscriptionExpiringSoon(subscriptionExpiresAt, 10);

  const totalUsers = userLimits?.currentCount || 0;
  const displayedCandidates = candidates.length > 0
    ? [...candidates]
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
      .slice(0, 3)
      .map((c, i) => {
        const rawPercentage = totalUsers > 0 ? ((c.voteCount || 0) / totalUsers) * 100 : 0;
        return {
          name: c.displayName || c.name || `Candidate ${i + 1}`,
          percentage: Math.round(rawPercentage),
          voteCount: c.voteCount || 0
        };
      })
    : [
      { name: "Candidate 1", percentage: 0, voteCount: 0 },
      { name: "Candidate 2", percentage: 0, voteCount: 0 },
      { name: "Candidate 3", percentage: 0, voteCount: 0 }
    ];

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      {shouldShowExpiryBanner && !isPending && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m2-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500">Subscription Renewal Reminder</p>
              <p className="text-xs text-amber-500/60">Your subscription expires in {subscriptionDaysUntilExpiry} day{subscriptionDaysUntilExpiry === 1 ? '' : 's'}. Renew now to avoid account restrictions.</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/40 px-3 py-1 rounded-lg border border-amber-500/10">Expiring Soon</p>
        </div>
      )}

      {isPending && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500">Account Verification Required</p>
              <p className="text-xs text-amber-500/60">Your tenant account is currently PENDING. Most features are disabled until a super-admin approves your registration.</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/40 px-3 py-1 rounded-lg border border-amber-500/10">Read Only Mode</p>
        </div>
      )}

      <div className={`flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden ${isRestricted ? 'grayscale-[0.5]' : ''}`}>
        <TenantAdminSidebar activePath="/users/tenant/dashboard" isRestricted={isRestricted} />

        <main className={`relative super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none ${isRestricted ? 'pointer-events-none opacity-60' : ''}`}>
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Dashboard</h1>
          {isRestricted && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070f]/95 p-6 text-center">
              <div className="max-w-xl rounded-[28px] border border-white/10 bg-[#090b14] p-8 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
                <h2 className="text-2xl font-bold text-white">Tenant account access is restricted</h2>
                <p className="mt-3 text-sm text-white/70">This tenant account is expired or pending approval. All management pages are locked. Please use Settings to manage your subscription or sign out.</p>
                <button
                  onClick={() => {
                    const destination = `/users/tenant/settings?role=tenant&random=${token ?? ''}`;
                    window.location.href = `/loader?destination=${encodeURIComponent(destination)}&duration=700`;
                  }}
                  className="mt-6 inline-flex items-center justify-center rounded-[16px] bg-[#5D44F8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#7c68ff]"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-6">
            <TimeWidget />

            {/* User Limits Tracking Widget */}
            {userLimits && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45 text-left">Account Usage</p>
                    <h2 className="mt-1 text-lg font-semibold text-white/90 truncate">Registered Users</h2>
                  </div>
                  <div className="flex items-baseline gap-0.5 shrink-0 ">
                    <span className="text-3xl font-bold tabular-nums text-[#D0C8FF]">{userLimits.currentCount}</span>
                    <span className="text-base font-semibold text-white/25 ml-1">
                      / {userLimits.limit === null ? "∞" : userLimits.limit}
                    </span>
                  </div>
                </div>
                {userLimits.limit !== null && (
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${(userLimits.currentCount / userLimits.limit) > 0.9
                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                        : 'bg-gradient-to-r from-emerald-400 to-cyan-300'
                        }`}
                      style={{ width: `${Math.min(100, (userLimits.currentCount / userLimits.limit) * 100)}%` }}
                    />
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Public Election Dashboard</p>
              <h2 className="mt-2 text-xl font-semibold text-white/90">Live Election Overview</h2>

              {dashboardLoading ? (
                <p className="mt-5 text-sm text-white/60">Loading public dashboard details...</p>
              ) : liveElectionsData.length > 0 ? (
                <div className="mt-5 flex flex-col gap-6">
                  {liveElectionsData.map((data, idx) => {
                    const phaseLabel = data.currentPhaseLabel.toLowerCase();
                    const isVotingOrResultsPhaseActive = phaseLabel === "voting" || phaseLabel === "results";
                    const currentPhaseIndex = phaseOrder.findIndex((phase) => phase.toLowerCase() === phaseLabel);
                    const phaseProgressPercent = currentPhaseIndex >= 0 ? ((currentPhaseIndex + 1) / phaseOrder.length) * 100 : 0;
                    const statusTone =
                      data.election.status === "ACTIVE"
                        ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/20"
                        : data.election.status === "PUBLISHED"
                          ? "bg-sky-400/15 text-sky-300 border-sky-400/20"
                          : "bg-white/10 text-white/70 border-white/15";

                    const totalUsers = userLimits?.currentCount || 0;
                    const displayedCandidates = data.candidates.length > 0
                      ? [...data.candidates]
                        .sort((a: any, b: any) => (b.voteCount || 0) - (a.voteCount || 0))
                        .slice(0, 3)
                        .map((c: any, i) => {
                          const rawPercentage = totalUsers > 0 ? ((c.voteCount || 0) / totalUsers) * 100 : 0;
                          return {
                            name: c.displayName || c.name || `Candidate ${i + 1}`,
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
                      <div key={data.election.id || idx} className="grid gap-3 sm:grid-cols-2">
                        {/* Status Card */}
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                          <div className="flex items-start justify-between">
                            <p className="text-xs uppercase tracking-[0.14em] text-white/40">Live Election Status</p>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone}`}>
                              {data.election.status}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-semibold text-white/90">{data.election.title}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            Public page is available
                          </div>
                        </div>

                        {/* Phase Card */}
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.14em] text-white/40">Current Phase</p>
                            {data.currentPhaseStatus && <PhaseStatusBadge status={data.currentPhaseStatus} size="sm" />}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-base font-semibold text-white/90">{data.currentPhaseLabel}</p>
                            {currentPhaseIndex >= 0 && (
                              <span className="rounded-md bg-[#5d44f8]/20 px-2 py-0.5 text-[11px] font-medium text-[#c4b9ff]">
                                {currentPhaseIndex + 1}/{phaseOrder.length}
                              </span>
                            )}
                          </div>
                          {data.phaseDeadline && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[11px] font-medium text-amber-400/80">
                                {getTimeRemaining(data.phaseDeadline)}
                              </span>
                            </div>
                          )}
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#6f59ff] to-[#9a8bff] shadow-[0_0_20px_rgba(111,89,255,0.55)] transition-all"
                              style={{ width: `${phaseProgressPercent}%` }}
                            />
                          </div>
                          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                            <span>Filing</span>
                            <span>Results</span>
                          </div>
                        </div>

                        {/* Vote Tallies */}
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.14em] text-white/40">Vote Tallies</p>
                          {isVotingOrResultsPhaseActive ? (
                            <div className="mt-4 space-y-6">
                              {getCandidatesByPosition(data.candidates, totalUsers).map((group, gIdx) => (
                                <div key={group.position || gIdx} className="space-y-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D0C8FF]/80 border-b border-white/5 pb-1">
                                    {group.position}
                                  </h4>
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    {group.candidates.map((cand, index) => {
                                      const isLeader = index === 0 && cand.voteCount > 0;
                                      return (
                                        <div key={cand.id || index} className={`rounded-lg border p-3 transition-all relative overflow-hidden ${isLeader ? 'border-[#5d44f8]/40 bg-[#5d44f8]/5 shadow-[0_0_15px_rgba(93,68,248,0.1)]' : 'border-white/10 bg-white/[0.02]'}`}>
                                          {isLeader && (
                                            <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                                              Leading
                                            </span>
                                          )}
                                          <div className="flex items-center justify-between text-xs text-white/60 pr-12">
                                            <span className="truncate max-w-[120px]" title={cand.name}>{cand.name}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-white/40">{cand.voteCount} {cand.voteCount === 1 ? 'vote' : 'votes'}</span>
                                              <span className="font-bold text-white/90">{cand.percentage}%</span>
                                            </div>
                                          </div>
                                          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                                            <div
                                              className={`h-full rounded-full ${isLeader ? 'bg-gradient-to-r from-emerald-400 to-cyan-300' : 'bg-gradient-to-r from-[#6f59ff] to-[#9a8bff]'}`}
                                              style={{ width: `${cand.percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-white/[0.01] px-4 py-3">
                              <p className="text-sm font-medium text-white/80">Vote tally appears when Voting phase is active.</p>
                              <p className="mt-1 text-xs text-white/50">A visual chart will automatically appear here once the election enters voting.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/40">Live Election Status</p>
                      <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 border-white/15">
                        NONE
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white/90">No live election</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                      <span className="inline-block h-2 w-2 rounded-full bg-white/20" />
                      No election is publicly live
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/40">Current Phase</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-base font-semibold text-white/90">N/A</p>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-white/5 transition-all" style={{ width: '0%' }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                      <span>Filing</span>
                      <span>Results</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/40">Vote Tallies</p>
                    {false ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {displayedCandidates.map((cand, index) => (
                          <div key={index} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between text-xs text-white/60">
                              <span className="truncate max-w-[100px]" title={cand.name}>{cand.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white/40">{cand.voteCount} {cand.voteCount === 1 ? 'vote' : 'votes'}</span>
                                <span className="font-bold text-white/90">{cand.percentage}%</span>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                                style={{ width: `${cand.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-white/[0.01] px-4 py-3">
                        <p className="text-sm font-medium text-white/80">Vote tally appears when Voting phase is active.</p>
                        <p className="mt-1 text-xs text-white/50">A visual chart will automatically appear here once the election enters voting.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
