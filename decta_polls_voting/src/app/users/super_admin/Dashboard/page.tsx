"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";
import { PieChart } from '@mui/x-charts/PieChart';
import {
  IconBallot,
  IconUsers,
  IconPercent,
} from "@/components/super_admin/Icons";
import { BallotCastAsOfLine } from "@/components/super_admin/Stats";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        const response = await fetch("/api/get_tenants?limit=10");
        const json = await response.json();

        if (!response.ok) throw new Error(json.error || "Failed to fetch data");

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
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none">
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Dashboard</h1>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <section className="super-admin-card stat-card rounded-[22px] border px-2 py-1.5 shadow-inner">
              <h2 className="mb-0 text-sm font-semibold text-white/90">Subscription Rate</h2>
              <div className="flex flex-col items-center justify-center gap-4 py-2 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex shrink-0 items-center justify-center">
                  <PieChart
                    series={[
                      {
                        data: [
                          { id: 0, value: 140, label: 'Enterprise', color: '#a855f7' },
                          { id: 1, value: 100, label: 'Standard', color: '#ef4444' },
                          { id: 2, value: 88, label: 'Basic', color: '#14b8a6' },
                        ],
                        innerRadius: '46%',
                        outerRadius: '92%',
                        paddingAngle: 6,
                        cornerRadius: 10,
                      },
                    ]}
                    width={216}
                    height={216}
                    hideLegend
                    sx={{
                      '& .MuiPieArc-root': {
                        stroke: 'none !important',
                        strokeWidth: 0,
                        filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
                      },
                    }}
                  />
                </div>
                <ul className="flex flex-wrap justify-center gap-2 sm:flex-col sm:gap-2 sm:pl-1">
                  <li className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-2.5 w-2.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.8)]" />Enterprise</li>
                  <li className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />Standard</li>
                  <li className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-2.5 w-2.5 rounded-full bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.7)]" />Basic</li>
                </ul>
              </div>
            </section>

            <div className="flex flex-col gap-4">
              <article className="super-admin-card stat-card flex items-start gap-4 rounded-[22px] border px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(93,68,248,0.15)] text-[#f1f0f3]"><IconBallot className="h-6 w-6" /></div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">69,696,969</p>
                  <BallotCastAsOfLine className="mt-1 text-xs text-white/45" />
                </div>
              </article>
              <article className="super-admin-card stat-card flex items-start gap-4 rounded-[22px] border px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(150,134,248,0.2)] text-[#f1f0f3]"><IconUsers className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">67,676,767</p>
                  <p className="mt-1 text-xs text-white/45">Total Registered Tenants</p>
                </div>
              </article>
              <article className="super-admin-card stat-card flex items-start gap-4 rounded-[22px] border px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.18)] text-[#5eead4]"><IconPercent className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">69.67%</p>
                  <p className="mt-1 text-xs text-white/45">Rate of Active Tenants</p>
                </div>
              </article>
            </div>
            <section className="mt-10 lg:col-span-2 w-full">
              <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Leading Active Tenants</h2>
              <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px]">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      <th className="px-5 py-4">Organization name</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Subscription</th>
                      <th className="px-5 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-5 py-6 text-white/60" colSpan={5}>Loading...</td></tr>
                    ) : leadingTenants.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-medium text-white/85">{row.organization}</td>
                        <td className="px-5 py-4 text-white/55">{row.email}</td>
                        <td className="px-5 py-4 text-white/60">{row.type}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85]">{row.subscription}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex rounded-full border ${row.status === "PENDING" ? "border-[#FF9632] bg-[#FF9632]/[0.20] text-[#FF9632]" : row.status === "REJECTED" ? "border-[#FF9632] bg-[#FF9632]/[0.20] text-[#FF9632]" : "border-[#5D44F8] bg-[#50C878]/[0.18] text-[#50C878]"} px-3 py-1 text-xs font-medium`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!loading && leadingTenants.length === 0) && (
                      <tr>
                        <td className="px-5 py-6 text-white/60" colSpan={5}>
                          {error ? `Error: ${error}` : "No tenants found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
