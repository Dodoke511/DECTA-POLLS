"use client";

import React, { useState } from "react";
import GlobalConfiguration from "../globalconfig";

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
function IconDashboard() {
  return <img src="/Dashboard.png" alt="Dashboard" width="22" height="22" />;
}
function IconTenants() {
  return <img src="/Tenants.png" alt="Tenants" width="22" height="22" />;
}
function IconSettings() {
  return <img src="/Settings.png" alt="Settings" width="22" height="22" />;
}
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
type SidebarItem = "Dashboard" | "Tenants" | "Settings";

function Sidebar({ activeItem, setActiveItem }: { activeItem: SidebarItem; setActiveItem: React.Dispatch<React.SetStateAction<SidebarItem>>; }) {
  const navItems: Array<{ label: SidebarItem; Icon: React.ComponentType }> = [
    { label: "Dashboard", Icon: IconDashboard },
    { label: "Tenants",   Icon: IconTenants   },
    { label: "Settings",  Icon: IconSettings  },
  ];

  return (
    <aside style={{
      width: 288,
      minHeight: "calc(100vh - 92px)",
      background: "rgba(217,217,217,0.13)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderRadius: "36px 0 0 36px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 16px 28px",
      flexShrink: 0,
      boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.07)",
    }}>
      {/* WELCOME */}
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <p style={{
          margin: 0,
          fontFamily: "Montserrat, sans-serif",
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1.1,
          background: "linear-gradient(180deg, #F0F1F3 0%, #7761FF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}>
          WELCOME!
        </p>
        <p style={{
          color: "#F1F0F3",
          fontSize: 13,
          fontFamily: "'Source Sans Pro', sans-serif",
          margin: "6px 0 0",
          opacity: 0.8,
        }}>
          Super Admin
        </p>
      </div>

      {/* Nav Items */}
      <nav style={{
        display: "flex", flexDirection: "column",
        gap: 10, width: "100%",
      }}>
        {navItems.map(({ label, Icon }) => {
          const isActive = label === activeItem;
          const baseColor = "rgba(28,22,62,0.38)"; // match the panel’s dark glass tone
          const hoverColor = "rgba(255,255,255,0.08)";
          return (
            <button
              key={label}
              onClick={() => setActiveItem(label)}
              style={{
                width: "100%",
                height: 64,
                borderRadius: 20,
                background: isActive
                  ? `linear-gradient(135deg, ${baseColor}, rgba(107,63,245,0.20))`
                  : `linear-gradient(135deg, ${baseColor}, rgba(30,24,74,0.65))`,
                border: isActive ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.18)",
                color: "#F1F0F3",
                fontFamily: "Montserrat, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "0 20px",
                gap: 14,
                transition: "all 0.25s ease",
                boxShadow: isActive
                  ? "-5px 5px 20px rgba(30,40,80,0.35), 0 0 0 1px rgba(255,255,255,0.2)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isActive ? `linear-gradient(135deg, rgba(255,255,255,0.8), rgba(107,63,245,0.20))` : `linear-gradient(135deg, ${hoverColor}, rgba(30,24,74,0.80))`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? `linear-gradient(135deg, ${baseColor}, rgba(107,63,245,0.20))` : `linear-gradient(135deg, ${baseColor}, rgba(30,24,74,0.65))`)}
            >
              <div style={{ width: 35, height: 35, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.2)", borderRadius: 10 }}>
                <Icon />
              </div>
              <span style={{ color: isActive ? "#ffffff" : "#F1F0F3" }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <button style={{
        background: "none",
        border: "none",
        color: "#F1F0F3",
        fontSize: 13,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: "auto",
        paddingTop: 32,
        opacity: 0.85,
      }}>
        <IconSignOut /> Sign Out
      </button>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <header style={{
      height: 56,
      width: "100%",
      background: "linear-gradient(90deg, #160C38 0%, #1b1050 50%, rgba(120,100,240,0.90) 100%)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 12,
      position: "fixed",
      top: 0, left: 0, zIndex: 100,
    }}>
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
  const [activeItem, setActiveItem] = useState<"Dashboard" | "Tenants" | "Settings">("Dashboard");
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
      // Deep purple gradient matching Figma
      background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
      fontFamily: "Montserrat, sans-serif",
    }}>
      <Topbar />

      {/* Body */}
      <div style={{
        display: "flex",
        paddingTop: 56,
        minHeight: "100vh",
        padding: "72px 20px 20px 20px",
        boxSizing: "border-box",
      }}>
        {/* Sidebar */}
        <div style={{ paddingTop: 16, paddingBottom: 16 }}>
          <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} />
        </div>

        {/* Main panel */}
        <main style={{
          flex: 1,
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: "0 36px 36px 0",
          padding: "28px 32px 36px",
          marginTop: 16,
          marginBottom: 16,
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