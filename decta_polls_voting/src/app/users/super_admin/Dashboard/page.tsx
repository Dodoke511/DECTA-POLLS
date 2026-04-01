import Link from "next/link";
import { BallotCastAsOfLine } from "./ballot-cast-as-of";
import { createClient } from "@supabase/supabase-js";
import {
  VerificationDownloadAction,
  VerificationEmailAction,
} from "./verification-actions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type TenantRow = {
  id: string;
  organization: string;
  email: string;
  type: string;
  isVerified: boolean;
  verification: string;
  verificationUrl: string | null;
  verificationFileName: string | null;
  subscription: string;
};

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getValueAsString(
  value: unknown,
  fallback: string,
): string {
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

async function toTenantRow(record: Record<string, unknown>, index: number): Promise<TenantRow> {
  const verified =
    typeof record.is_verified === "boolean"
      ? record.is_verified
      : record.verified;
  const verificationFromFlag =
    typeof verified === "boolean" ? (verified ? "Approved" : "Pending") : undefined;
  const verificationValue = getValueAsString(
    record.verification ?? verificationFromFlag,
    "Pending",
  );
  const verificationPath = extractTenantVerificationPath(verificationValue);
  const verificationFileName = toFileName(verificationPath);

  let verificationUrl: string | null = null;
  if (verificationPath) {
    const { data } = await supabase
      .storage
      .from("tenant_verifications")
      .createSignedUrl(verificationPath, 60 * 60);
    verificationUrl = data?.signedUrl ?? null;
  }

  return {
    id: getValueAsString(record.id, `tenant-${index}`),
    organization: getValueAsString(
      record.organization ?? record.organization_name,
      "Unknown Organization",
    ),
    email: getValueAsString(record.email, "No Email"),
    type: getValueAsString(record.type, "N/A"),
    isVerified: typeof verified === "boolean" ? verified : false,
    verification: verificationValue,
    verificationUrl,
    verificationFileName,
    subscription: getValueAsString(record.subscription, "Standard"),
  };
}

import {
  IconBallot,
  IconUsers,
  IconPercent,
} from "@/components/super_admin/Icons";

export default async function SuperAdminDashboardPage() {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const leadingTenants: TenantRow[] = !error && Array.isArray(data)
    ? await Promise.all(
      data.map((row, index) => toTenantRow(row as Record<string, unknown>, index)),
    )
    : [];

  return (
    <>
      <h1
        className="mb-8 text-3xl font-bold tracking-tight md:text-4xl"
        style={{
          color: "#D0C8FF",
          textShadow: "2px 2px 20px rgba(208,200,255,0.45)"
        }}
      >
        Dashboard
      </h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <section className="rounded-[22px] border p-6 shadow-inner" style={{
          background: "rgba(217,217,217,0.09)",
          border: "1px solid rgba(203,191,255,0.10)"
        }}>
          <h2 className="mb-6 text-lg font-semibold text-white/90">Subscription Rate</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
            <div className="relative h-52 w-52 shrink-0">
              <div
                className="h-full w-full rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_-4px_12px_rgba(0,0,0,0.25)]"
                style={{
                  background:
                    "conic-gradient(#a855f7 0deg 140deg, #ef4444 140deg 272deg, #14b8a6 272deg 360deg)",
                }}
              />
              <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-[#12122b] shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                <span className="text-2xl font-bold tabular-nums text-white md:text-3xl">480.41</span>
              </div>
            </div>
            <ul className="flex flex-wrap justify-center gap-4 sm:flex-col sm:gap-3">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="h-3 w-3 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                Enterprise
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="h-3 w-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                Standard
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="h-3 w-3 rounded-full bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.7)]" />
                Basic
              </li>
            </ul>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <article className="flex items-start gap-4 rounded-[22px] border px-5 py-5" style={{
            background: "rgba(217,217,217,0.09)",
            border: "1px solid rgba(203,191,255,0.10)",
            boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)"
          }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(93,68,248,0.15)] text-[#f1f0f3]">
              <IconBallot className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">69,696,969</p>
              <BallotCastAsOfLine className="mt-1 text-xs text-white/45" />
            </div>
          </article>
          <article className="flex items-start gap-4 rounded-[22px] border px-5 py-5" style={{
            background: "rgba(217,217,217,0.09)",
            border: "1px solid rgba(203,191,255,0.10)",
            boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)"
          }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(150,134,248,0.2)] text-[#f1f0f3]">
              <IconUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">67,676,767</p>
              <p className="mt-1 text-xs text-white/45">Total Registered Tenants</p>
            </div>
          </article>
          <article className="flex items-start gap-4 rounded-[22px] border px-5 py-5" style={{
            background: "rgba(217,217,217,0.09)",
            border: "1px solid rgba(203,191,255,0.10)",
            boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)"
          }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.18)] text-[#5eead4]">
              <IconPercent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">69.67%</p>
              <p className="mt-1 text-xs text-white/45">Rate of Active Tenants</p>
            </div>
          </article>
        </div>
      </div>

      <section className="mt-10">
        <h2
          className="mb-5 text-xl font-bold md:text-2xl"
          style={{
            color: "#D0C8FF",
            textShadow: "2px 2px 20px rgba(208,200,255,0.45)"
          }}
        >
          Leading Active Tenants
        </h2>
        <table className="w-full border-collapse text-left text-sm rounded-[22px] bg-white/[0.09] shadow-[5px_5px_10px_2px_rgba(255,255,255,0.06)]">
          <thead>
            <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <th className="px-5 py-4">Organization name</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4 text-center">Verification</th>
              <th className="px-5 py-4">Subscription</th>
              <th className="px-5 py-4 text-center" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {leadingTenants.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 font-medium text-white/85">{row.organization}</td>
                <td className="px-5 py-4 text-white/55">{row.email}</td>
                <td className="px-5 py-4 text-white/60">{row.type}</td>
                <td className="px-5 py-4 text-center">
                  {row.verificationUrl ? (
                    <VerificationDownloadAction
                      verificationUrl={row.verificationUrl}
                      verificationFileName={row.verificationFileName}
                    />
                  ) : (
                    <span className="inline-flex rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85]">
                      {row.verification}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85]">
                    {row.subscription}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <VerificationEmailAction
                    tenantId={row.id}
                    tenantEmail={row.email}
                    tenantOrganization={row.organization}
                    verificationUrl={row.verificationUrl}
                    isVerified={row.isVerified}
                  />
                </td>
              </tr>
            ))}
            {leadingTenants.length === 0 && (
              <tr>
                <td className="px-5 py-6 text-white/60" colSpan={6}>
                  {error
                    ? "Unable to load tenants from database."
                    : "No tenants found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
