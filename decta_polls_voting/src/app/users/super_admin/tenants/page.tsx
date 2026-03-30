import Link from "next/link";

type Tenant = {
  orgName: string;
  email: string;
  type: "University" | "Company";
  verified: boolean;
  status: "Approved" | "Pending" | "Rejected";
  subscription: "Enterprise" | "Standard" | "Basic";
};

const TENANTS: Tenant[] = [
  {
    orgName: "CEBU INSTITUTE TECHNOLOGY",
    email: "cit-university@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "UNIVERSITY OF CEBU",
    email: "universityCeb@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "CEBU DOCTORS UNIVERSITY",
    email: "cebudoctorsU@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "VELEZ COLLEGE",
    email: "velezCollege@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "MONSTER CORP.",
    email: "monsterCorps@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
  {
    orgName: "INCORPORATED INC.",
    email: "incorporated@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
  {
    orgName: "CEBU INSTITUTE TECHNOLOGY",
    email: "cit-university@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "UNIVERSITY OF CEBU",
    email: "universityCeb@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "CEBU DOCTORS UNIVERSITY",
    email: "cebudoctorsU@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "VELEZ COLLEGE",
    email: "velezCollege@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "MONSTER CORP.",
    email: "monsterCorps@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
  {
    orgName: "INCORPORATED INC.",
    email: "incorporated@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
  {
    orgName: "CEBU INSTITUTE TECHNOLOGY",
    email: "cit-university@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "UNIVERSITY OF CEBU",
    email: "universityCeb@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Enterprise",
  },
  {
    orgName: "CEBU DOCTORS UNIVERSITY",
    email: "cebudoctorsU@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "VELEZ COLLEGE",
    email: "velezCollege@mail.com",
    type: "University",
    verified: true,
    status: "Approved",
    subscription: "Standard",
  },
  {
    orgName: "MONSTER CORP.",
    email: "monsterCorps@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
  {
    orgName: "INCORPORATED INC.",
    email: "incorporated@mail.com",
    type: "Company",
    verified: true,
    status: "Approved",
    subscription: "Basic",
  },
];

function Pill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "green" | "purple" | "orange" | "gray";
}) {
  const styles: Record<typeof variant, string> = {
    green:
      "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,.15)]",
    purple:
      "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25 shadow-[0_0_0_1px_rgba(139,92,246,.15)]",
    orange:
      "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25 shadow-[0_0_0_1px_rgba(245,158,11,.15)]",
    gray:
      "bg-white/8 text-white/70 ring-1 ring-white/15 shadow-[0_0_0_1px_rgba(255,255,255,.08)]",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function Icon({
  name,
  className,
}: {
  name: "dashboard" | "tenants" | "settings" | "logout" | "download";
  className?: string;
}) {
  const common = `h-5 w-5 ${className ?? ""}`;
  if (name === "dashboard") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4h7v9H4V4Zm9 0h7v5h-7V4ZM4 15h7v5H4v-5Zm9-4h7v9h-7v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "tenants") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.4 15a8.6 8.6 0 0 0 .1-1l2-1.2-2-3.5-2.3.5a8.1 8.1 0 0 0-1.7-1L15 6h-6L8.5 8.8a8.1 8.1 0 0 0-1.7 1L4.5 9.3l-2 3.5L4.6 14a8.6 8.6 0 0 0 .1 1l-2 1.2 2 3.5 2.3-.5a8.1 8.1 0 0 0 1.7 1L9 22h6l.5-2.8a8.1 8.1 0 0 0 1.7-1l2.3.5 2-3.5-2.1-1.2Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 7V6a2 2 0 0 1 2-2h7v16h-7a2 2 0 0 1-2-2v-1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 12H3m0 0 3-3M3 12l3 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className={common}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v10m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14v5h16v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavButton({
  active,
  icon,
  children,
  href,
}: {
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold tracking-wide",
        "border border-white/10 bg-white/5 text-white/75",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        "hover:bg-white/8 hover:text-white",
        active ? "bg-white/10 text-white border-white/15" : "",
      ].join(" ")}
    >
      <span className="text-white/70 group-hover:text-white/90">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

export default function SuperAdminTenantsPage() {
  return (
    <div className="min-h-screen bg-[var(--decta-bg)] text-[var(--decta-text)]">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_18%_18%,rgba(93,68,248,0.42),transparent_58%),radial-gradient(850px_circle_at_85%_22%,rgba(150,134,248,0.26),transparent_55%),radial-gradient(900px_circle_at_70%_82%,rgba(93,68,248,0.16),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#231638]/80 via-[#5D44F8]/18 to-[#231638]/80" />

        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--decta-surface-strong)] ring-1 ring-[var(--decta-border)]">
                <img
                  src="/logo.png"
                  alt="D.E.C.T.A Polls"
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="text-sm font-semibold text-[var(--decta-text)]/90">
                D.E.C.T.A Polls | Tenant Admin
              </div>
            </div>
            <div className="text-xs text-[var(--decta-text-muted)]">
              SuperAdmin Tenants
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="relative overflow-hidden rounded-[28px] border border-[var(--decta-border)] bg-[var(--decta-surface)] p-7 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F1F0F3]/12 via-transparent to-transparent opacity-70" />

              <div className="relative">
                <div className="mb-10">
                  <div className="text-4xl font-extrabold tracking-tight text-[var(--decta-text)]/90">
                    WELCOME!
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--decta-text-muted)]">
                    Super Admin
                  </div>
                </div>

                <nav className="flex flex-col gap-4">
                  <NavButton
                    href="/users/super_admin"
                    icon={<Icon name="dashboard" />}
                  >
                    Dashboard
                  </NavButton>
                  <NavButton
                    href="/users/super_admin/tenants"
                    active
                    icon={<Icon name="tenants" />}
                  >
                    Tenants
                  </NavButton>
                  <NavButton
                    href="/users/super_admin/settings"
                    icon={<Icon name="settings" />}
                  >
                    Settings
                  </NavButton>
                </nav>

                <div className="mt-12 border-t border-[var(--decta-border)] pt-6">
                  <Link
                    href="/auth/login_form"
                    className="group inline-flex items-center gap-3 text-sm font-semibold text-[var(--decta-text-muted)] hover:text-[var(--decta-text)]/80"
                  >
                    <span className="text-[var(--decta-text-muted)] group-hover:text-[var(--decta-text)]/80">
                      <Icon name="logout" />
                    </span>
                    <span>Sign Out</span>
                  </Link>
                </div>
              </div>
            </aside>

            <main className="relative overflow-hidden rounded-[28px] border border-[var(--decta-border)] bg-[var(--decta-surface)] px-10 py-8 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F1F0F3]/12 via-transparent to-transparent opacity-70" />

              <div className="relative">
                <h1 className="text-5xl font-extrabold tracking-tight text-[#F1F0F3]/70">
                  Tenants
                </h1>

                <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--decta-border)] bg-[#231638]/35">
                  <div className="w-full max-h-[520px] overflow-auto">
                    <table className="min-w-[980px] w-full border-collapse text-left">
                    <thead>
                      <tr className="text-xs font-bold tracking-[0.18em] text-[#F1F0F3]/55">
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          ORGANIZATION NAME
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          EMAIL
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          TYPE
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          VERIFICATION
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          STATUS
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-5 bg-[#231638]/85 backdrop-blur">
                          SUBSCRIPTION
                        </th>
                      </tr>
                      <tr>
                        <td
                          colSpan={6}
                          className="sticky top-[52px] z-10 h-px bg-[var(--decta-border)]"
                        />
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[#F1F0F3]/70">
                      {TENANTS.map((t, idx) => (
                        <tr
                          key={`${t.orgName}-${idx}`}
                          className="hover:bg-[#F1F0F3]/[0.03]"
                        >
                          <td className="px-6 py-4 font-semibold text-[#F1F0F3]/60">
                            {t.orgName}
                          </td>
                          <td className="px-6 py-4">{t.email}</td>
                          <td className="px-6 py-4">{t.type}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg p-2 text-[#F1F0F3]/55 hover:bg-[#F1F0F3]/5 hover:text-[#F1F0F3]/85"
                              aria-label={`Download verification for ${t.orgName}`}
                            >
                              <Icon name="download" className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <Pill
                              variant={
                                t.status === "Approved"
                                  ? "green"
                                  : t.status === "Pending"
                                    ? "gray"
                                    : "orange"
                              }
                            >
                              {t.status}
                            </Pill>
                          </td>
                          <td className="px-6 py-4">
                            <Pill
                              variant={
                                t.subscription === "Enterprise"
                                  ? "green"
                                  : t.subscription === "Standard"
                                    ? "purple"
                                    : "orange"
                              }
                            >
                              {t.subscription}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={6} className="h-3" />
                      </tr>
                    </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-[#F1F0F3]/40">
                  <div>Showing {TENANTS.length} tenants</div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

