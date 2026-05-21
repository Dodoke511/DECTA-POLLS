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

interface TenantAuditLog {
  id: number;
  timestamp: string;
  tenant: string;
  actor: string;
  action: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const systemMonitoringLogs: AuditLog[] = [
  { id: 1, timestamp: "2026-03-20 14:32:15", tenant: "CEBU INSTITUTE TECHNOLOGY", action: "Subscription Change", status: "Success" },
  { id: 2, timestamp: "2026-03-20 14:32:15", tenant: "UNIVERSITY OF CEBU",        action: "Password Reset",       status: "Success" },
  { id: 3, timestamp: "2026-03-20 14:32:15", tenant: "CEBU DOCTORS UNIVERSITY",   action: "Subscription Change", status: "Warning" },
  { id: 4, timestamp: "2026-03-20 14:32:15", tenant: "VELEZ COLLEGE",             action: "Subscription Change", status: "Warning" },
  { id: 5, timestamp: "2026-03-20 14:32:15", tenant: "MONSTER CORP.",             action: "Subscription Change", status: "Error"   },
  { id: 6, timestamp: "2026-03-20 14:32:15", tenant: "INCORPORATED INC.",         action: "Subscription Change", status: "Error"   },
];

const tenantAuditLogs: TenantAuditLog[] = [
  { id: 101, timestamp: "2026-05-21 09:14:02", tenant: "CEBU INSTITUTE TECHNOLOGY", actor: "Maria Santos · Tenant Admin",      action: "Created election: SSG General Elections 2026" },
  { id: 102, timestamp: "2026-05-21 08:47:33", tenant: "UNIVERSITY OF CEBU",        actor: "elections@uc.edu.ph",              action: "Finished election: Board of Directors Vote 2025" },
  { id: 103, timestamp: "2026-05-20 16:22:08", tenant: "MONSTER CORP.",             actor: "James Rivera · Billing Admin",     action: "Updated subscription plan to Enterprise" },
  { id: 104, timestamp: "2026-05-20 11:05:41", tenant: "VELEZ COLLEGE",             actor: "Ana Dela Cruz · Election Officer", action: "Launched election: Student Council Midterm Poll" },
  { id: 105, timestamp: "2026-05-19 18:30:55", tenant: "CEBU DOCTORS UNIVERSITY",   actor: "admin@cdu.edu.ph",                 action: "Published election results: Faculty Senate 2026" },
  { id: 106, timestamp: "2026-05-19 14:12:19", tenant: "INCORPORATED INC.",         actor: "hr-admin@incorporated.inc",        action: "Created election: HR Committee Representative" },
  { id: 107, timestamp: "2026-05-18 10:08:44", tenant: "UNIVERSITY OF CEBU",        actor: "Carlos Mendoza · Tenant Admin",    action: "Updated branding and organization profile" },
  { id: 108, timestamp: "2026-05-17 15:41:27", tenant: "CEBU INSTITUTE TECHNOLOGY", actor: "Maria Santos · Tenant Admin",      action: "Finished election: Department Chair Selection" },
  { id: 109, timestamp: "2026-05-16 09:55:03", tenant: "MONSTER CORP.",             actor: "James Rivera · Tenant Admin",      action: "Added tenant admin user: operations@monstercorp.com" },
  { id: 110, timestamp: "2026-05-15 13:20:16", tenant: "VELEZ COLLEGE",             actor: "Ana Dela Cruz · Election Officer", action: "Election launch failed: missing phase configuration" },
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
      className={`${active ? "super-admin-nav-item-active" : "super-admin-button"} px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap`}
    >
      {label}
    </button>
  );
}

// ─── Audit Table ──────────────────────────────────────────────────────────────
function AuditLogsTable({ logs, showActionStatus = true }: { logs: AuditLog[]; showActionStatus?: boolean }) {
  return (
    <div className="super-admin-table w-full rounded-[22px] border border-white/[0.10] overflow-hidden mb-8">
      <div className="w-full">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <th className="px-6 py-4">TIMESTAMP</th>
              <th className="px-6 py-4">TENANT</th>
              <th className="px-6 py-4">ACTION</th>
              {showActionStatus && <th className="px-6 py-4">ACTION STATUS</th>}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-24 py-16 text-center text-white/40">
                  No results found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-white/[0.07] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-white/80">{log.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-white/90">{log.tenant}</td>
                  <td className="px-6 py-4 text-white/60">{log.action}</td>
                  {showActionStatus && (
                    <td className="px-6 py-4">
                      <StatusBadge status={log.status} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TenantAuditLogsTable({ logs }: { logs: TenantAuditLog[] }) {
  return (
    <div className="super-admin-table w-full rounded-[22px] border border-white/[0.10] overflow-hidden mb-8">
      <div className="w-full">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <th className="px-6 py-4">TIMESTAMP</th>
              <th className="px-6 py-4">TENANT</th>
              <th className="px-6 py-4">PERFORMED BY</th>
              <th className="px-6 py-4">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-24 py-16 text-center text-white/40">
                  No results found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-white/[0.07] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-white/80">{log.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-white/90">{log.tenant}</td>
                  <td className="px-6 py-4 text-white/75">{log.actor}</td>
                  <td className="px-6 py-4 text-white/60">{log.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Search Audit ─────────────────────────────────────────────────────────────
function SearchAudit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="super-admin-button flex items-center gap-2.5 rounded-xl px-4 py-2 min-w-[210px]">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{
        background: "rgba(255,255,255,0.13)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}>
        <IconUser />
      </div>
      <input
        type="text"
        placeholder="Search Audit"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none font-montserrat text-sm font-bold w-32"
        style={{ color: '#f1f0f3' }}
      />
    </div>
  );
}

import { useRouter } from "next/navigation";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemMonitoringPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"monitoring" | "config" | "audit">("monitoring");
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

  const filterMonitoringLogs = (logs: AuditLog[]) => {
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.tenant.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
    );
  };

  const filterTenantAuditLogs = (logs: TenantAuditLog[]) => {
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.tenant.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
    );
  };

  const filteredMonitoring = filterMonitoringLogs(systemMonitoringLogs);
  const filteredTenantAudit = filterTenantAuditLogs(tenantAuditLogs);

  return (
    <div className="flex flex-col h-screen text-[#f1f0f3]" style={{
      background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <SuperAdminHeader />

      <div className="flex flex-1 gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <SuperAdminSidebar activePath="/users/super_admin/system-monitoring" />

        <main className="super-admin-dashboard-main flex-1 flex flex-col rounded-[28px] border shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:rounded-l-none overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8">
            {/* Page Title */}
            <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{
              color: "#D0C8FF",
              textShadow: "2px 2px 20px rgba(208,200,255,0.45)",
            }}>
              {pageTitle}
            </h1>

            {/* Tabs + Search */}
            <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
              <div className="flex gap-2.5">
                <TabButton label="System Monitoring"   active={activeTab === "monitoring"} onClick={() => setActiveTab("monitoring")} />
                <TabButton label="Global Configuration" active={activeTab === "config"}    onClick={() => setActiveTab("config")} />
                <TabButton label="Audit Logs"           active={activeTab === "audit"}     onClick={() => setActiveTab("audit")} />
              </div>
              {(activeTab === "monitoring" || activeTab === "audit") && (
                <SearchAudit value={search} onChange={setSearch} />
              )}
            </div>

            {/* Main Content */}
            {activeTab === "monitoring" ? (
              <AuditLogsTable logs={filteredMonitoring} />
            ) : activeTab === "audit" ? (
              <TenantAuditLogsTable logs={filteredTenantAudit} />
            ) : (
            <div className="flex-1">
              <GlobalConfiguration />
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
