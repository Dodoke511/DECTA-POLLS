"use client";

import React, { useState } from "react";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";
import { GlobalConfiguration } from "@/app/users/super_admin/system-configuration/page";

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
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#F1F0F3" opacity="0.9"/>
      <path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" fill="#F1F0F3" opacity="0.9"/>
    </svg>
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

import { useRouter } from "next/navigation";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemMonitoringPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"monitoring" | "config">("monitoring");
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('adminToken');

    if (role !== 'super_admin' || !random || random !== storedToken) {
      router.push('/auth/login_form');
    }
  }, [router]);

  const pageTitle = activeTab === "config" ? "Settings" : "Settings";

  const filtered = auditLogs.filter((l) =>
    l.tenant.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#f1f0f3]" style={{
      background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <SuperAdminHeader />

      <div className="flex flex-1 overflow-hidden flex-col gap-4 p-4 md:flex-row md:p-6">
        <SuperAdminSidebar activePath="/users/super_admin/system-monitoring" />

        <main className="min-w-0 flex-1 rounded-[28px] border shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm overflow-y-auto no-scrollbar h-full" style={{
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(203,191,255,0.10)",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
          padding: "28px 32px 36px",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Page Title */}
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{
            color: "#D0C8FF",
            textShadow: "2px 2px 20px rgba(208,200,255,0.45)",
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
            <div className="w-full rounded-[22px] border border-white/[0.10] bg-white/[0.09] shadow-[5px_5px_10px_2px_rgba(255,255,255,0.06)] overflow-hidden">
              {/* Table Wrapper */}
              <div className="w-full">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      <th className="px-6 py-4">TIMESTAMP</th>
                      <th className="px-6 py-4">TENANT</th>
                      <th className="px-6 py-4">ACTION</th>
                      <th className="px-6 py-4">ACTION STATUS</th>
                    </tr>
                  </thead>
                  <tbody>

                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-24 py-16 text-center text-white/40">
                          No results found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-white/[0.07] last:border-0 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-white/80">{log.timestamp}</td>
                          <td className="px-6 py-4 font-medium text-white/90">{log.tenant}</td>
                          <td className="px-6 py-4 text-white/60">{log.action}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={log.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <GlobalConfiguration />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
