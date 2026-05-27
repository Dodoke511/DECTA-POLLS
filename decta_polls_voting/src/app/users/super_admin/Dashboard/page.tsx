"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";
import { PieChart } from '@mui/x-charts/PieChart';
import {
  IconBallot,
  IconUsers,
  IconPendingApproval,
} from "@/components/super_admin/Icons";
import {
  CompletedElectionsAsOfLine,
  CompletedElectionsPeriodFilter,
  type CompletedElectionPeriod,
} from "@/components/super_admin/Stats";
import { useRouter } from "next/navigation";
import type { SubscriptionTier } from "@/lib/subscription-limits";

type DashboardStats = {
  subscriptionBreakdown: Record<SubscriptionTier, number>;
  totalTenants: number;
  pendingTenantApprovals: number;
  completedElections: number;
  completedElectionsPeriod: CompletedElectionPeriod;
  statsAsOf: string;
};

const PIE_COLORS: Record<SubscriptionTier, string> = {
  ENTERPRISE: "#a855f7",
  STANDARD: "#ef4444",
  BASIC: "#14b8a6",
};

const PIE_LABELS: Record<SubscriptionTier, string> = {
  ENTERPRISE: "Enterprise",
  STANDARD: "Standard",
  BASIC: "Basic",
};

function formatCount(value: number): string {
  return value.toLocaleString();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// --- Types ---
export type TenantRow = {
  id: string;
  organization: string;
  email: string;
  type: string;
  status: string;
  isVerified: boolean;
  verification: string;
  verificationUrl: string | null;
  verificationFileName: string | null;
  subscription: string;
};

// --- Helper Functions ---
function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getValueAsString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

function sanitizeStoragePath(path: string): string {
  return path.replace(/^\/+/, "");
}

function extractTenantVerificationPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isHttpUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const marker = "/tenant_verifications/";
      const markerIndex = parsed.pathname.indexOf(marker);
      if (markerIndex >= 0) {
        const filePart = parsed.pathname.slice(markerIndex + marker.length);
        return filePart ? decodeURIComponent(sanitizeStoragePath(filePart)) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("tenant_verifications/")) {
    return sanitizeStoragePath(trimmed.slice("tenant_verifications/".length));
  }

  return sanitizeStoragePath(trimmed);
}

function toFileName(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1] ?? null;
}

// --- Main Page Component ---
export default function SuperAdminDashboardPage() {
  const [leadingTenants, setLeadingTenants] = useState<TenantRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [electionPeriod, setElectionPeriod] = useState<CompletedElectionPeriod>("month");
  const [completedElectionsLoading, setCompletedElectionsLoading] = useState(false);
  const router = useRouter();

  const fetchDashboardStats = useCallback(async (period: CompletedElectionPeriod) => {
    const res = await fetch(`/api/super_admin/dashboard_stats?period=${period}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Failed to fetch dashboard stats");
    }
    return json as DashboardStats;
  }, []);

  useEffect(() => {
    async function fetchData() {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      const random = params.get('random');
      const storedToken = sessionStorage.getItem('adminToken');

      if (role !== 'super_admin' || !random || random !== storedToken) {
        router.push('/auth/login_form');
        return;
      }

      try {
        const [statsJson, tenantsRes] = await Promise.all([
          fetchDashboardStats("month"),
          fetch("/api/get_tenants?limit=10&activeOnly=true&sortBy=elections"),
        ]);

        const json = await tenantsRes.json();

        if (!tenantsRes.ok) throw new Error(json.error || "Failed to fetch tenants");

        setStats(statsJson);
        setStatsLoading(false);

        const tenants = await Promise.all(
          json.data.map(async (record: Record<string, unknown>, index: number): Promise<TenantRow> => {
            const verified = typeof record.is_verified === "boolean" ? record.is_verified : record.verified;
            const verificationFromFlag = typeof verified === "boolean" ? (verified ? "Approved" : "Pending") : undefined;
            const verificationValue = getValueAsString(record.verification ?? verificationFromFlag, "Pending");
            const verificationPath = extractTenantVerificationPath(verificationValue);
            const verificationFileName = toFileName(verificationPath);

            let verificationUrl: string | null = null;
            if (verificationPath) {
              const { data } = await supabaseClient.storage.from("tenant_verifications").createSignedUrl(verificationPath, 60 * 60);
              verificationUrl = data?.signedUrl ?? null;
            }

            return {
              id: getValueAsString(record.id, `tenant-${index}`),
              organization: getValueAsString(record.organization ?? record.organization_name, "Unknown Organization"),
              email: getValueAsString(record.email, "No Email"),
              type: getValueAsString(record.type, "N/A"),
              status: getValueAsString(record.status, "PENDING"),
              isVerified: typeof verified === "boolean" ? verified : false,
              verification: verificationValue,
              verificationUrl,
              verificationFileName,
              subscription: getValueAsString(record.subscription, "Standard"),
            };
          })
        );

        setLeadingTenants(tenants);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setStatsLoading(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router, fetchDashboardStats]);

  const handleElectionPeriodChange = async (period: CompletedElectionPeriod) => {
    setElectionPeriod(period);
    setCompletedElectionsLoading(true);

    try {
      const statsJson = await fetchDashboardStats(period);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              completedElections: statsJson.completedElections,
              completedElectionsPeriod: statsJson.completedElectionsPeriod,
              statsAsOf: statsJson.statsAsOf,
            }
          : statsJson
      );
    } catch {
      // Keep previous count if refresh fails
    } finally {
      setCompletedElectionsLoading(false);
    }
  };

  const pieData = (() => {
    if (!stats) return [];
    const tiers: SubscriptionTier[] = ["ENTERPRISE", "STANDARD", "BASIC"];
    const segments = tiers
      .map((tier, index) => ({
        id: index,
        value: stats.subscriptionBreakdown[tier],
        label: PIE_LABELS[tier],
        color: PIE_COLORS[tier],
      }))
      .filter((segment) => segment.value > 0);

    if (segments.length === 0) {
      return [{ id: 0, value: 1, label: "No tenants", color: "rgba(255,255,255,0.15)" }];
    }
    return segments;
  })();

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <SuperAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <SuperAdminSidebar activePath="/users/super_admin/Dashboard" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border py-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:py-8 overflow-y-auto no-scrollbar md:rounded-l-none">
          <div className="px-6 md:px-8">
            <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Dashboard</h1>

            <div className="flex w-full flex-col gap-6">
              <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
                
                {/* Left side: Subscription Rate Donut Chart Container */}
                <section className="super-admin-card stat-card box-border flex-1 rounded-[22px] border p-5 shadow-inner md:p-6 flex flex-col justify-center items-center min-w-0">
                  <h2 className="mb-4 w-full text-center text-xs font-bold uppercase tracking-wider text-white/70">
                    Subscription Rate
                  </h2>
                  <div className="flex flex-row items-center gap-4 sm:gap-6 justify-center w-full">
                    {/* Fixed-size wrapper to prevent MUI Charts layout bugs */}
                    <div className="w-[160px] h-[160px] shrink-0 flex items-center justify-center">
                      <PieChart
                        series={[
                          {
                            data: pieData,
                            innerRadius: "46%",
                            outerRadius: "92%",
                            paddingAngle: pieData.length > 1 ? 6 : 0,
                            cornerRadius: 10,
                          },
                        ]}
                        width={160}
                        height={160}
                        hideLegend
                        sx={{
                          "& .MuiPieArc-root": {
                            stroke: "none !important",
                            strokeWidth: 0,
                            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
                          },
                        }}
                      />
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {(["ENTERPRISE", "STANDARD", "BASIC"] as SubscriptionTier[]).map((tier) => (
                        <li key={tier} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-white/80">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: PIE_COLORS[tier], boxShadow: `0 0 8px ${PIE_COLORS[tier]}99` }}
                          />
                          <span className="whitespace-nowrap">
                            {PIE_LABELS[tier]}
                            {stats && !statsLoading && (
                              <span className="text-white/45"> ({stats.subscriptionBreakdown[tier]})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Right side: 3 Stat Cards Stacked Vertically */}
                <div className="flex flex-col gap-4 w-full lg:w-[320px] lg:min-w-[320px] shrink-0 justify-center">
                  
                  {/* Card 1: Completed Elections */}
                  <article className="flex flex-col gap-3 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(93,68,248,0.15)] border border-[rgba(93,68,248,0.25)] text-[#f1f0f3]">
                        <IconBallot className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tracking-tight text-white">
                          {statsLoading || completedElectionsLoading
                            ? "—"
                            : formatCount(stats?.completedElections ?? 0)}
                        </p>
                        <CompletedElectionsAsOfLine
                          className="mt-0.5 text-xs text-white/50"
                          asOf={stats?.statsAsOf}
                          period={stats?.completedElectionsPeriod ?? electionPeriod}
                        />
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] my-1" />
                    <CompletedElectionsPeriodFilter
                      value={electionPeriod}
                      onChange={handleElectionPeriodChange}
                      disabled={statsLoading || completedElectionsLoading}
                    />
                  </article>

                  {/* Card 2: Total Registered Tenants */}
                  <article className="flex flex-col justify-center w-full rounded-[16px] border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-white/[0.04] transition-all min-h-[88px]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(150,134,248,0.15)] border border-[rgba(150,134,248,0.25)] text-[#f1f0f3]">
                        <IconUsers className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tracking-tight text-white">
                          {statsLoading ? "—" : formatCount(stats?.totalTenants ?? 0)}
                        </p>
                        <p className="mt-0.5 text-xs text-white/50">Total Registered Tenants</p>
                      </div>
                    </div>
                  </article>

                  {/* Card 3: Pending Tenant Approvals */}
                  <article className="flex flex-col justify-center w-full rounded-[16px] border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-white/[0.04] transition-all min-h-[88px]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(150,134,248,0.15)] border border-[rgba(150,134,248,0.25)] text-[#f1f0f3]">
                        <IconPendingApproval className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tracking-tight text-white">
                          {statsLoading ? "—" : formatCount(stats?.pendingTenantApprovals ?? 0)}
                        </p>
                        <p className="mt-0.5 text-xs text-white/50">Pending Tenant Approvals</p>
                      </div>
                    </div>
                  </article>

                </div>

              </div>

              {/* Leading Active Tenants Table Section placed correctly as a full-width sibling in the layout flow */}
              <section className="mt-6 w-full">
                <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Leading Active Tenants</h2>
                <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px]" style={{ minWidth: "100%" }}>
                  <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      <th className="px-6 py-4">Organization name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Subscription</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-6 py-6 text-white/60" colSpan={5}>Loading...</td></tr>
                    ) : leadingTenants.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-white/85">{row.organization}</td>
                        <td className="px-6 py-4 text-white/55">{row.email}</td>
                        <td className="px-6 py-4 text-white/60">{row.type}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85]">{row.subscription}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex rounded-full border ${row.status === "PENDING" ? "border-[#FF9632] bg-[#FF9632]/[0.20] text-[#FF9632]" : row.status === "REJECTED" ? "border-[#FF9632] bg-[#FF9632]/[0.20] text-[#FF9632]" : "border-[#5D44F8] bg-[#50C878]/[0.18] text-[#50C878]"} px-3 py-1 text-xs font-medium`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!loading && leadingTenants.length === 0) && (
                      <tr>
                        <td className="px-6 py-6 text-white/60" colSpan={5}>
                          {error ? `Error: ${error}` : "No tenants found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
