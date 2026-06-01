"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";
import { GlobalConfiguration } from "@/app/users/super_admin/system-configuration/page";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  timestamp: string;
  tenant: string;
  action: string;
  performedBy: string;
}

interface RetentionElection {
  id: string;
  title: string;
  tenantId: string | null;
  tenant: string;
  endDate: string;
  expiryDate: string;
  hardDeleteDate: string;
  remainingHours?: number;
  daysPast?: number;
}

interface RetentionStatus {
  audit_log_days: number;
  election_data_days: number;
  expiring: RetentionElection[];
  deletable: RetentionElection[];
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

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={spinning ? "animate-spin" : undefined}
    >
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        stroke="#F1F0F3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 3v6h-6"
        stroke="#F1F0F3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

// ─── Audit Log Table ──────────────────────────────────────────────────────────
function AuditLogTable({
  logs,
  loading,
  error,
}: {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
}) {
  const colCount = 4;
  return (
    <div className="super-admin-table w-full rounded-[22px] border border-white/[0.10] overflow-x-auto decta-scrollbar mb-8">
      <div className="w-full">
        <table className="w-full border-collapse text-left text-sm min-w-[700px] md:min-w-0">
          <thead>
            <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <th className="px-6 py-4">TIMESTAMP</th>
              <th className="px-6 py-4">TENANT</th>
              <th className="px-6 py-4">ACTION</th>
              <th className="px-6 py-4">PERFORMED BY</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-24 py-16 text-center text-white/40">
                  Loading audit logs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colCount} className="px-24 py-16 text-center text-red-300/80">
                  {error}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-24 py-16 text-center text-white/40">
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
                  <td className="px-6 py-4 text-white/75">{log.performedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Search + Refresh ─────────────────────────────────────────────────────────
function MonitoringToolbar({
  search,
  onSearchChange,
  onRefresh,
  refreshing,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
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
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-transparent border-none outline-none font-montserrat text-sm font-bold w-32"
          style={{ color: "#f1f0f3" }}
        />
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh audit logs"
        title="Refresh table"
        className="super-admin-button flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconRefresh spinning={refreshing} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemMonitoringPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"monitoring" | "config">("monitoring");
  const [search, setSearch] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [retentionInfo, setRetentionInfo] = useState<RetentionStatus | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [auditCleanupLoading, setAuditCleanupLoading] = useState(false);
  const [deletingElectionId, setDeletingElectionId] = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('adminToken');

    if (role !== 'super_admin' || !random || random !== storedToken) {
      router.push('/auth/login_form');
    }
  }, [router]);

  const loadAuditLogs = useCallback(async (signal?: { cancelled: boolean }) => {
    setLogsLoading(true);
    setLogsError(null);

    try {
      const res = await fetch("/api/super_admin/audit_logs");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch audit logs");
      }

      if (!signal?.cancelled) {
        setAuditLogs(json.logs ?? []);
      }
    } catch (err) {
      if (!signal?.cancelled) {
        setLogsError(err instanceof Error ? err.message : "Failed to fetch audit logs");
        setAuditLogs([]);
      }
    } finally {
      if (!signal?.cancelled) {
        setLogsLoading(false);
      }
    }
  }, []);

  const loadRetentionInfo = useCallback(async (signal?: { cancelled: boolean }) => {
    setRetentionLoading(true);
    setRetentionError(null);

    try {
      const res = await fetch("/api/super_admin/retention/expired");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch retention status");
      }

      if (!signal?.cancelled) {
        setRetentionInfo({
          audit_log_days: json.retention?.audit_log_days ?? 0,
          election_data_days: json.retention?.election_data_days ?? 0,
          expiring: json.expiring ?? [],
          deletable: json.deletable ?? [],
        });
      }
    } catch (err) {
      if (!signal?.cancelled) {
        setRetentionError(err instanceof Error ? err.message : "Failed to fetch retention status");
        setRetentionInfo(null);
      }
    } finally {
      if (!signal?.cancelled) {
        setRetentionLoading(false);
      }
    }
  }, []);

  const runAuditLogCleanup = useCallback(async () => {
    setAuditCleanupLoading(true);
    setRetentionMessage(null);

    try {
      const res = await fetch("/api/cron/audit_log_retention", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Audit log cleanup failed");
      }
      setRetentionMessage({ text: "Audit log cleanup completed successfully.", type: 'success' });
      loadRetentionInfo();
    } catch (err) {
      setRetentionMessage({ text: err instanceof Error ? err.message : "Audit log cleanup failed.", type: 'error' });
    } finally {
      setAuditCleanupLoading(false);
    }
  }, [loadRetentionInfo]);

  const notifyTenant = useCallback(async (tenantId: string | null, electionId: string, electionTitle?: string) => {
    if (!tenantId) {
      setRetentionMessage({ text: "Missing tenant ID to notify.", type: 'error' });
      return;
    }

    setDeletingElectionId(electionId);
    setRetentionMessage(null);

    try {
      const title = `Election at risk of deletion: ${electionTitle ?? 'Untitled'}`;
      const message = `Your election \"${electionTitle ?? 'Untitled'}\" has exceeded the configured retention period and will be deleted soon unless you remove it. Please visit your Elections page to review or delete it.`;

      const res = await fetch('/api/super_admin/notifications/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, electionId, title, message }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Notification failed');
      }

      setRetentionMessage({ text: 'Tenant notified successfully.', type: 'success' });
    } catch (err) {
      setRetentionMessage({ text: err instanceof Error ? err.message : 'Notification failed.', type: 'error' });
    } finally {
      setDeletingElectionId(null);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "monitoring") return;

    const token = { cancelled: false };
    loadAuditLogs(token);
    loadRetentionInfo(token);

    return () => {
      token.cancelled = true;
    };
  }, [activeTab, loadAuditLogs, loadRetentionInfo]);

  const pageTitle = activeTab === "config" ? "Settings" : "Settings";

  const filtered = auditLogs.filter((l) =>
    l.tenant.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.performedBy.toLowerCase().includes(search.toLowerCase()) ||
    l.timestamp.toLowerCase().includes(search.toLowerCase())
  );

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
              </div>
              {activeTab === "monitoring" && (
                <MonitoringToolbar
                  search={search}
                  onSearchChange={setSearch}
                  onRefresh={() => loadAuditLogs()}
                  refreshing={logsLoading}
                />
              )}
            </div>

            {/* Main Content */}
            {activeTab === "monitoring" ? (
              <>
                <div className="super-admin-card rounded-[22px] border border-white/[0.10] bg-[#090b14]/70 p-6 mb-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Retention Overview</p>
                      <h2 className="mt-2 text-xl font-bold text-white/90">Audit & Election Retention</h2>
                      <p className="mt-2 text-sm text-white/60 max-w-2xl">
                        These values are managed by the super admin. Audit log retention is a backend cleanup policy, while election retention identifies completed elections that are eligible for deletion.
                      </p>
                    </div>
                    <button
                      onClick={runAuditLogCleanup}
                      disabled={auditCleanupLoading}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#6B3FF5] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5833cc] disabled:opacity-50"
                    >
                      {auditCleanupLoading ? 'Cleaning up...' : 'Run Audit Log Cleanup'}
                    </button>
                  </div>

                  {retentionMessage && (
                    <div className={`mt-5 rounded-2xl border p-4 ${retentionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
                      {retentionMessage.text}
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Audit Log Retention</p>
                      <p className="mt-3 text-3xl font-semibold text-white/90">
                        {retentionLoading ? '—' : retentionInfo?.audit_log_days ?? '—'}
                      </p>
                      <p className="mt-2 text-sm text-white/50">days until old audit logs may be removed.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Election Data Retention</p>
                      <p className="mt-3 text-3xl font-semibold text-white/90">
                        {retentionLoading ? '—' : retentionInfo?.election_data_days ?? '—'}
                      </p>
                      <p className="mt-2 text-sm text-white/50">days after completion before election data becomes eligible for deletion.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Pending Retention Alerts</p>
                      <p className="mt-3 text-3xl font-semibold text-white/90">
                        {retentionLoading ? '—' : ((retentionInfo?.expiring.length ?? 0) + (retentionInfo?.deletable.length ?? 0))}
                      </p>
                      <p className="mt-2 text-sm text-white/50">completed elections that are expiring or ready for deletion.</p>
                    </div>
                  </div>

                  {retentionLoading ? (
                    <p className="mt-6 text-sm text-white/50">Loading retention candidates...</p>
                  ) : retentionError ? (
                    <p className="mt-6 text-sm text-red-300">{retentionError}</p>
                  ) : (retentionInfo && (retentionInfo.expiring.length > 0 || retentionInfo.deletable.length > 0)) ? (
                    <div className="mt-6 space-y-4">
                      {retentionInfo.deletable.length > 0 && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-sm font-semibold text-white/80">Ready to Delete</p>
                          <div className="mt-3 space-y-3">
                            {retentionInfo.deletable.map((election) => (
                              <div key={election.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0f0b1c]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold text-white/90">{election.title}</p>
                                  <p className="text-sm text-white/50">{election.tenant} · Completed {new Date(election.endDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-white/40 mt-1">Expired {election.daysPast ?? 0} days ago. Tenant is responsible for deletion; you can notify them.</p>
                                </div>
                                <button
                                  disabled={deletingElectionId === election.id}
                                  onClick={() => notifyTenant(election.tenantId, election.id, election.title)}
                                  className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                                >
                                  {deletingElectionId === election.id ? 'Notifying...' : 'Notify Tenant'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {retentionInfo.expiring.length > 0 && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-sm font-semibold text-white/80">Expiring Soon</p>
                          <div className="mt-3 space-y-3">
                            {retentionInfo.expiring.map((election) => (
                              <div key={election.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0f0b1c]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold text-white/90">{election.title}</p>
                                  <p className="text-sm text-white/50">{election.tenant} · Completed {new Date(election.endDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-white/40 mt-1">Will be auto-deleted in {election.remainingHours} hours unless the tenant removes it. You can notify the tenant now.</p>
                                </div>
                                <button
                                  disabled={deletingElectionId === election.id}
                                  onClick={() => notifyTenant(election.tenantId, election.id, election.title)}
                                  className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                                >
                                  {deletingElectionId === election.id ? 'Notifying...' : 'Notify Tenant'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-white/50">No retention candidates are currently expiring or ready for deletion.</p>
                  )}
                </div>

                <AuditLogTable logs={filtered} loading={logsLoading} error={logsError} />
              </>
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
