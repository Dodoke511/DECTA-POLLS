"use client";

import React, { useState } from "react";
import Link from "next/link";
import GlobalConfiguration from "@/src/app/users/super_admin/system-configuration/globalconfig";

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionStatus = "Success" | "Warning" | "Error";

interface AuditLog {
  id: number;
  timestamp: string;
  tenant: string;
  action: string;
  status: ActionStatus;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const auditLogs: AuditLog[] = [
  { id: 1, timestamp: "2026-03-20 14:32:15", tenant: "CEBU INSTITUTE TECHNOLOGY", action: "Subscription Change", status: "Success" },
  { id: 2, timestamp: "2026-03-20 14:32:15", tenant: "UNIVERSITY OF CEBU",        action: "Password Reset",       status: "Success" },
  { id: 3, timestamp: "2026-03-20 14:32:15", tenant: "CEBU DOCTORS UNIVERSITY",   action: "Subscription Change", status: "Warning" },
  { id: 4, timestamp: "2026-03-20 14:32:15", tenant: "VELEZ COLLEGE",             action: "Subscription Change", status: "Warning" },
  { id: 5, timestamp: "2026-03-20 14:32:15", tenant: "MONSTER CORP.",             action: "Subscription Change", status: "Error"   },
  { id: 6, timestamp: "2026-03-20 14:32:15", tenant: "INCORPORATED INC.",         action: "Subscription Change", status: "Error"   },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ActionStatus }) {
  const map: Record<ActionStatus, { bg: string; border: string; color: string }> = {
    Success: {
      bg:     "rgba(80,200,120,0.18)",
      border: "rgba(93,68,248,0.50)",
      color:  "rgba(80,200,120,0.85)",
    },
    Warning: {
      bg:     "rgba(245,248,68,0.22)",
      border: "rgba(245,248,68,0.35)",
      color:  "rgba(220,224,50,0.95)",
    },
    Error: {
      bg:     "rgba(255,150,50,0.18)",
      border: "rgba(93,68,248,0.50)",
      color:  "#FF9632",
    },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
      padding: "4px 16px",
      borderRadius: 999,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "Montserrat, sans-serif",
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function IconSignOut() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#F1F0F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      <polyline points="16 17 21 12 16 7" stroke="#F1F0F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="#F1F0F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#F1F0F3" opacity="0.9"/>
      <path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" fill="#F1F0F3" opacity="0.9"/>
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col rounded-3xl border md:w-[260px] md:rounded-r-3xl md:rounded-l-none py-8 pl-5 pr-4" style={{
      background: "rgba(217,217,217,0.13)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(203,191,255,0.10)",
      boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)"
    }}>
      <div className="mb-10 px-2 text-center">
        <p className="text-2xl font-bold tracking-tight text-[#9686f8]" style={{ textShadow: "0 0 24px rgba(93,68,248,0.35)" }}>
          WELCOME!
        </p>
        <p className="mt-1 text-sm text-white/55">Super Admin</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2.5" aria-label="Main">
        <Link
          href="/users/super_admin/Dashoard"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-white/75 transition hover:text-white"
          style={{
            background: "linear-gradient(135deg, rgba(28,22,62,0.38), rgba(30,24,74,0.65))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)"
          }}
        >
          <img src="/Dashboard.png" alt="Dashboard" width="20" height="20" />
          Dashboard
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-white/75 transition hover:text-white"
          style={{
            background: "linear-gradient(135deg, rgba(28,22,62,0.38), rgba(30,24,74,0.65))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)"
          }}
        >
          <img src="/Tenants.png" alt="Tenants" width="20" height="20" />
          Tenants
        </Link>
        <Link
          href="/users/super_admin/system-monitoring"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-white transition"
          style={{
            background: "linear-gradient(135deg, rgba(28,22,62,0.38), rgba(107,63,245,0.20))",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "-5px 5px 20px rgba(30,40,80,0.35), 0 0 0 1px rgba(255,255,255,0.2)"
          }}
        >
          <img src="/Settings.png" alt="Settings" width="20" height="20" />
          Settings
        </Link>
      </nav>

      <button
        type="button"
        className="mt-6 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium text-white/65 transition"
        style={{
          background: "rgba(255, 100, 100, 0.08)",
          border: "1px solid rgba(255,100,100,0.2)"
        }}
      >
        <IconSignOut />
        Sign Out
      </button>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <header className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-3.5 backdrop-blur-md" style={{ background: "linear-gradient(90deg, #160C38 0%, #1b1050 50%, rgba(120,100,240,0.90) 100%)" }}>
      <img src="/DECTA LOGO.png" alt="DECTA Logo" width="36" height="36" style={{ borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)" }} />
      <span style={{
        color: "#F1F0F3",
        fontSize: 14,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 500,
      }}>
        D.E.C.T.A Polls | Tenant Admin
      </span>
    </header>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 22px",
        borderRadius: 999,
        cursor: "pointer",
        background: active ? "#6B3FF5" : "rgba(255,255,255,0.08)",
        border: `1px solid ${active ? "#4e2ec0" : "rgba(100,80,180,0.50)"}`,
        color: "#F1F0F3",
        fontFamily: "Montserrat, sans-serif",
        fontSize: 13,
        fontWeight: 700,
        transition: "background 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Search Audit ─────────────────────────────────────────────────────────────
function SearchAudit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(255,255,255,0.05)",
      borderRadius: 12,
      border: "1px solid rgba(241,240,243,0.50)",
      padding: "7px 16px",
      minWidth: 210,
    }}>
      {/* Avatar circle */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "rgba(255,255,255,0.13)",
        border: "1px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <IconUser />
      </div>
      <input
        type="text"
        placeholder="Search Audit"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "none",
          border: "none",
          outline: "none",
          color: "#F1F0F3",
          fontFamily: "Montserrat, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          width: 130,
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemMonitoring() {
  const [activeTab, setActiveTab] = useState<"monitoring" | "config">("monitoring");
  const [search, setSearch] = useState("");

  const pageTitle = activeTab === "config" ? "Settings" : "Settings";

  const filtered = auditLogs.filter((l) =>
    l.tenant.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
      fontFamily: "Montserrat, sans-serif",
    }}>
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-3.5 backdrop-blur-md" style={{ background: "linear-gradient(90deg, #160C38 0%, #1b1050 50%, rgba(120,100,240,0.90) 100%)" }}>
        <img src="/DECTA LOGO.png" alt="DECTA Logo" width="36" height="36" style={{ borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)" }} />
        <span style={{
          color: "#F1F0F3",
          fontSize: 14,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 500,
        }}>
          D.E.C.T.A Polls | Tenant Admin
        </span>
      </header>

      <div className="flex min-h-[calc(100vh-53px)] flex-col gap-4 p-4 md:flex-row md:p-6">
        <Sidebar />

        <main style={{
          flex: 1,
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: "0 36px 36px 0",
          padding: "28px 32px 36px",
          marginTop: 0,
          marginBottom: 0,
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Page Title */}
          <h1 style={{
            color: "#D0C8FF",
            fontSize: 42,
            fontWeight: 600,
            fontFamily: "Montserrat, sans-serif",
            textShadow: "2px 2px 20px rgba(208,200,255,0.45)",
            margin: "0 0 24px",
          }}>
            {pageTitle}
          </h1>

          {/* Tabs + Search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 30,
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 10 }}>
              <TabButton label="System Monitoring"   active={activeTab === "monitoring"} onClick={() => setActiveTab("monitoring")} />
              <TabButton label="Global Configuration" active={activeTab === "config"}    onClick={() => setActiveTab("config")} />
            </div>
            {activeTab === "monitoring" && <SearchAudit value={search} onChange={setSearch} />}
          </div>

          {/* Main Content */}
          {activeTab === "monitoring" ? (
            <div style={{
              background: "rgba(217,217,217,0.09)",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(203,191,255,0.10)",
            }}>
              {/* Column Headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "210px 1fr 170px 130px",
                padding: "18px 28px 14px",
                alignItems: "center",
              }}>
              {["TIMESTAMP", "TENANT", "ACTION", "ACTION STATUS"].map((h) => (
                <span key={h} style={{
                  color: "#F1F0F3",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "Montserrat, sans-serif",
                  letterSpacing: "0.04em",
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: "rgba(203,191,255,0.55)",
              margin: "0 24px",
            }} />

            {/* Data Rows */}
            {filtered.length === 0 ? (
              <div style={{
                padding: 48,
                textAlign: "center",
                color: "rgba(241,240,243,0.4)",
                fontSize: 14,
              }}>
                No results found.
              </div>
            ) : (
              filtered.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "210px 1fr 170px 130px",
                    padding: "14px 28px",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(203,191,255,0.07)",
                  }}
                >
                  {/* Timestamp */}
                  <span style={{
                    color: "#F1F0F3",
                    fontSize: 16,
                    fontFamily: "'Source Sans Pro', sans-serif",
                    fontWeight: 400,
                  }}>
                    {log.timestamp}
                  </span>

                  {/* Tenant */}
                  <span style={{
                    color: "#F1F0F3",
                    fontSize: 16,
                    fontFamily: "'Source Sans Pro', sans-serif",
                    fontWeight: 400,
                  }}>
                    {log.tenant}
                  </span>

                  {/* Action */}
                  <span style={{
                    color: "#F1F0F3",
                    fontSize: 13,
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 500,
                  }}>
                    {log.action}
                  </span>

                  {/* Status */}
                  <div>
                    <StatusBadge status={log.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <GlobalConfiguration />
        )}
        </main>
      </div>
    </div>
  );
}
