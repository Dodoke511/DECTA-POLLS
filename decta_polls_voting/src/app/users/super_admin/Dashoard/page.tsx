import Link from "next/link";
import { BallotCastAsOfLine } from "./ballot-cast-as-of";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";
import {
  VerificationDownloadAction,
  VerificationEmailAction,
} from "./verification-actions";

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
    const { data } = await supabaseAdmin
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

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v6h6V4h-6z" strokeLinejoin="round" />
    </svg>
  );
}

function IconTenants({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 5h16v14H4V5z" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" strokeLinejoin="round" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 001.87.34H12a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V12c0 .65.34 1.28.9 1.62L19.4 15z" strokeLinejoin="round" />
    </svg>
  );
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBallot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h6" strokeLinecap="round" />
      <path d="M12 19v2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPercent({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M19 5L5 19M9.5 9.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19.5 14.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoMark() {
  return (
    <img
      src="/decta-logo.png"
      alt="D.E.C.T.A Polls"
      className="h-9 w-9 shrink-0 rounded-full object-contain shadow-[0_0_20px_rgba(93,68,248,0.25)]"
    />
  );
}

export default async function SuperAdminDashboardPage() {
  const { data, error } = await supabaseAdmin
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
    <div className="min-h-screen bg-[#231638] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(150,134,248,0.22),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(93,68,248,0.12),transparent_55%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(93,68,248,0.08),transparent_50%)] text-[#f1f0f3]">
      <header className="flex items-center gap-3 border-b border-white/[0.06] bg-[#231638]/90 px-6 py-3.5 backdrop-blur-md">
        <LogoMark />
        <span className="text-sm font-medium tracking-wide text-white/95">
          D.E.C.T.A Polls <span className="text-white/45">|</span> Tenant Admin
        </span>
      </header>

      <div className="flex min-h-[calc(100vh-53px)] flex-col gap-4 p-4 md:flex-row md:p-6">
        <aside className="flex w-full shrink-0 flex-col rounded-3xl border border-white/[0.08] bg-[rgba(35,22,56,0.55)] py-8 pl-5 pr-4 shadow-[0_0_50px_rgba(93,68,248,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:w-[260px] md:rounded-r-3xl md:rounded-l-none">
          <div className="mb-10 px-2">
            <p className="text-2xl font-bold tracking-tight text-[#9686f8]" style={{ textShadow: "0 0 24px rgba(93,68,248,0.35)" }}>
              WELCOME!
            </p>
            <p className="mt-1 text-sm text-white/55">Super Admin</p>
          </div>

          <nav className="flex flex-1 flex-col gap-2.5" aria-label="Main">
            <Link
              href="/users/super_admin/Dashoard"
              className="flex items-center gap-3 rounded-2xl border border-[#5d44f8]/45 bg-[rgba(93,68,248,0.12)] px-4 py-3.5 text-sm font-medium text-white shadow-[0_0_28px_rgba(93,68,248,0.2)] transition hover:bg-[rgba(93,68,248,0.18)]"
            >
              <IconDashboard className="h-5 w-5 text-[#f1f0f3]" />
              Dashboard
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <IconTenants className="h-5 w-5 text-white/55" />
              Tenants
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
            >
              <IconSettings className="h-5 w-5 text-white/55" />
              Settings
            </Link>
          </nav>

          <button
            type="button"
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-transparent px-4 py-3 text-sm font-medium text-white/65 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
          >
            <IconSignOut className="h-5 w-5" />
            Sign Out
          </button>
        </aside>

        <main className="min-w-0 flex-1 rounded-[28px] border border-[#5d44f8]/20 bg-[linear-gradient(145deg,rgba(35,22,56,0.92),rgba(12,10,28,0.96))] p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8">
          <h1
            className="mb-8 text-3xl font-bold tracking-tight text-[#9686f8] md:text-4xl"
            style={{ textShadow: "0 0 32px rgba(93,68,248,0.4)" }}
          >
            Dashboard
          </h1>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <section className="rounded-[22px] border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-6 shadow-inner">
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
              <article className="flex items-start gap-4 rounded-[22px] border border-white/[0.1] bg-[rgba(255,255,255,0.04)] px-5 py-5 shadow-[0_0_24px_rgba(93,68,248,0.08)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(93,68,248,0.15)] text-[#f1f0f3]">
                  <IconBallot className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">69,696,969</p>
                  <BallotCastAsOfLine className="mt-1 text-xs text-white/45" />
                </div>
              </article>
              <article className="flex items-start gap-4 rounded-[22px] border border-white/[0.1] bg-[rgba(255,255,255,0.04)] px-5 py-5 shadow-[0_0_24px_rgba(93,68,248,0.08)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(150,134,248,0.2)] text-[#f1f0f3]">
                  <IconUsers className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-[1.65rem]">67,676,767</p>
                  <p className="mt-1 text-xs text-white/45">Total Registered Tenants</p>
                </div>
              </article>
              <article className="flex items-start gap-4 rounded-[22px] border border-white/[0.1] bg-[rgba(255,255,255,0.04)] px-5 py-5 shadow-[0_0_24px_rgba(93,68,248,0.08)]">
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
              className="mb-5 text-xl font-bold text-[#9686f8] md:text-2xl"
              style={{ textShadow: "0 0 20px rgba(93,68,248,0.25)" }}
            >
              Leading Active Tenants
            </h2>
            <div className="overflow-x-auto rounded-[22px] border border-white/[0.08] bg-[rgba(0,0,0,0.2)]">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-white/45">
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
                    <tr key={row.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
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
                          <span className="inline-flex rounded-full border border-[#2ecc71]/35 bg-[#2ecc71]/15 px-3 py-1 text-xs font-medium text-[#6ee7a0]">
                            {row.verification}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-[#2ecc71]/35 bg-[#2ecc71]/12 px-3 py-1 text-xs font-medium text-[#6ee7a0]">
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
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
