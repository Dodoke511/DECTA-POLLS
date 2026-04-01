import React from "react";
import Link from "next/link";
import { IconDashboard, IconTenants, IconSettings, IconSignOut } from "./Icons";

interface SidebarProps {
  activePath: string;
}

export function SuperAdminSidebar({ activePath }: SidebarProps) {
  const getItemStyle = (path: string) => {
    const isActive = activePath === path;
    if (isActive) {
      return {
        background: "linear-gradient(135deg, rgba(28,22,62,0.38), rgba(107,63,245,0.20))",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "-5px 5px 20px rgba(30,40,80,0.35), 0 0 0 1px rgba(255,255,255,0.2)"
      };
    }
    return {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)"
    };
  };

  const getTextStyle = (path: string) => {
    return activePath === path ? "text-white" : "text-white/75 hover:text-white";
  };

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-3xl border md:w-[260px] md:rounded-r-3xl md:rounded-l-none py-8 pl-5 pr-4 h-full overflow-y-auto no-scrollbar" style={{
      background: "rgba(217,217,217,0.13)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(203,191,255,0.10)",
      boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)"
    }}>
      <div className="mb-10 px-2 text-center">
        <p style={{
          margin: 0,
          fontFamily: "Montserrat, sans-serif",
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.1,
          background: "linear-gradient(180deg, #F0F1F3 0%, #7761FF 100%)",
          backgroundClip: "text",
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

      <div className="flex flex-1 flex-col gap-2.5" role="navigation" aria-label="Main Navigation">
        <Link
          href="/users/super_admin/Dashboard"
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${getTextStyle("/users/super_admin/Dashboard")}`}
          style={getItemStyle("/users/super_admin/Dashboard")}
        >
          <IconDashboard className="h-5 w-5 shrink-0" />
          Dashboard
        </Link>
        <Link
          href="/users/super_admin/system-monitoring"
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${getTextStyle("/users/super_admin/system-monitoring")}`}
          style={getItemStyle("/users/super_admin/system-monitoring")}
        >
          <IconTenants className="h-5 w-5 shrink-0" />
          Tenants
        </Link>
        <Link
          href="/users/super_admin/system-configuration"
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${getTextStyle("/users/super_admin/system-configuration")}`}
          style={getItemStyle("/users/super_admin/system-configuration")}
        >
          <IconSettings className="h-5 w-5 shrink-0" />
          Settings
        </Link>
      </div>

      <button
        type="button"
        className="mt-6 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium text-white/65 transition hover:text-white"
        style={{
          background: "rgba(255, 100, 100, 0.08)",
          border: "1px solid rgba(255,100,100,0.2)"
        }}
      >
        <IconSignOut className="h-5 w-5" />
        Sign Out
      </button>
    </aside>
  );
}
