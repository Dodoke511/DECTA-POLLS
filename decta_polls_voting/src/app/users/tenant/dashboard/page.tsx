"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { PhaseStatusBadge } from "@/components/tenant_admin/PhaseStatusBadge";
import { PhaseStatus } from "@/lib/workflow/PhaseResolverService";

type ElectionSummary = {
  id: string;
  title: string;
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

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [liveElection, setLiveElection] = useState<ElectionSummary | null>(null);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState("No phase is currently active");
  const [currentPhaseStatus, setCurrentPhaseStatus] = useState<PhaseStatus | null>(null);
  const [phaseDeadline, setPhaseDeadline] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const random = params.get('random');
    const status = params.get('status') || sessionStorage.getItem('tenantStatus');
    const storedSupabaseToken = sessionStorage.getItem('supabaseToken');

    // If we have a token in params, restore sessionStorage for continued access
    if (random) {
      sessionStorage.setItem('tenantToken', random);
    }

    // If we still don't have a Supabase token, try to get it from params or storage
    if (!storedSupabaseToken && params.get('token')) {
      sessionStorage.setItem('supabaseToken', params.get('token')!);
    }

    setTenantStatus(status);
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
        const live = elections.find((e) => e.status === "ACTIVE") || elections.find((e) => e.status === "PUBLISHED") || null;

        setLiveElection(live);

        if (live?.id) {
          const phaseRes = await fetch(`/api/workflow/current_phase?electionId=${live.id}`);
          const phaseData = await phaseRes.json();

          if (phaseData?.phase_type) {
            const readable = phaseData.phase_type.charAt(0).toUpperCase() + phaseData.phase_type.slice(1);
            setCurrentPhaseLabel(readable);
            setCurrentPhaseStatus(phaseData.status || 'active');
            setPhaseDeadline(phaseData.deadline || null);
          } else {
            setCurrentPhaseLabel("No phase is currently active");
            setCurrentPhaseStatus(null);
          }
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

  const isPending = tenantStatus === 'PENDING';
  const isVotingPhaseActive = currentPhaseLabel.toLowerCase() === "voting";
  const currentPhaseIndex = phaseOrder.findIndex((phase) => phase.toLowerCase() === currentPhaseLabel.toLowerCase());
  const phaseProgressPercent = currentPhaseIndex >= 0 ? ((currentPhaseIndex + 1) / phaseOrder.length) * 100 : 0;
  const statusTone =
    liveElection?.status === "ACTIVE"
      ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/20"
      : liveElection?.status === "PUBLISHED"
        ? "bg-sky-400/15 text-sky-300 border-sky-400/20"
        : "bg-white/10 text-white/70 border-white/15";

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

      <div className={`flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden ${isPending ? 'grayscale-[0.5]' : ''}`}>
        <TenantAdminSidebar activePath="/users/tenant/dashboard" isRestricted={isPending} />

        <main className={`super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none ${isPending ? 'pointer-events-none opacity-60' : ''}`}>
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Dashboard</h1>

          <div className="grid gap-6">
            <TimeWidget />
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Public Election Dashboard</p>
              <h2 className="mt-2 text-xl font-semibold text-white/90">Live Election Overview</h2>

              {dashboardLoading ? (
                <p className="mt-5 text-sm text-white/60">Loading public dashboard details...</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/40">Live Election Status</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone}`}>
                        {liveElection?.status ?? "NONE"}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white/90">{liveElection?.title ?? "No live election"}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      {liveElection ? "Public page is available" : "No election is publicly live"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/40">Current Phase</p>
                      {currentPhaseStatus && <PhaseStatusBadge status={currentPhaseStatus} size="sm" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-base font-semibold text-white/90">{liveElection ? currentPhaseLabel : "N/A"}</p>
                      {liveElection && currentPhaseIndex >= 0 && (
                        <span className="rounded-md bg-[#5d44f8]/20 px-2 py-0.5 text-[11px] font-medium text-[#c4b9ff]">
                          {currentPhaseIndex + 1}/{phaseOrder.length}
                        </span>
                      )}
                    </div>
                    {/* Deadline Countdown */}
                    {phaseDeadline && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[11px] font-medium text-amber-400/80">
                          {getTimeRemaining(phaseDeadline)}
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

                  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/40">Vote Tallies</p>
                    {isVotingPhaseActive ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {[72, 51, 34].map((value, index) => (
                          <div key={index} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between text-xs text-white/60">
                              <span>Candidate {index + 1}</span>
                              <span>{value}%</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                                style={{ width: `${value}%` }}
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
