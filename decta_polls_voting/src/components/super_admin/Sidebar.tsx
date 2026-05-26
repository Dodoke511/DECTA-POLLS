"use client";

import React from "react";
import Link from "next/link";
import { IconDashboard, IconTenants, IconSettings, IconSignOut } from "./Icons";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activePath: string;
}

export function SuperAdminSidebar({ activePath }: SidebarProps) {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string>("Super Admin");
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setToken(sessionStorage.getItem('adminToken'));
    
    // Determine user role from URL
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    
    if (role === 'super_admin') {
      setUserRole('Super Admin');
    } else if (role === 'tenant') {
      setUserRole('Tenant Admin');
    } else if (role === 'voter') {
      setUserRole('Voter');
    } else {
      setUserRole('Super Admin');
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('adminToken');
    router.push('/loader?destination=' + encodeURIComponent('/') + '&duration=700');
  };

  const getItemStyle = (path: string) => {
    const isActive = activePath === path;
    return isActive ? "super-admin-nav-item-active" : "super-admin-nav-item";
  };

  const getTextStyle = (path: string) => {
    return activePath === path ? "text-white" : "text-white/75 hover:text-white";
  };

  const getUrlWithToken = (path: string) => {
    if (!token) return path;
    return `${path}?role=super_admin&random=${token}`;
  };

  const getLoaderUrl = (path: string) => {
    return `/loader?destination=${encodeURIComponent(getUrlWithToken(path))}&duration=700`;
  };

  return (
    <aside className="super-admin-sidebar flex w-full shrink-0 flex-row md:flex-col rounded-3xl border md:w-[220px] lg:w-[260px] md:rounded-r-none py-3 md:py-8 px-4 md:pl-5 md:pr-4 items-center md:items-stretch justify-between md:justify-start gap-4 md:gap-0">
      <div className="hidden md:block mb-8 md:mb-10 px-2 text-center">
        <p className="plan-title-gradient" style={{
          margin: 0,
          fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
          fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: 700,
          lineHeight: 1.1,
          display: "inline-block",
          whiteSpace: "nowrap",
        }}>
          WELCOME!
        </p>
        <p style={{
          color: "var(--color-decta-text)",
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif",
          margin: "6px 0 0",
          opacity: 0.8,
        }}>
          {userRole}
        </p>
      </div>

      <div className="flex flex-row md:flex-col flex-1 md:flex-1 gap-2 md:gap-2.5 justify-start items-center md:items-stretch" role="navigation" aria-label="Main Navigation">
        <Link
          href={getLoaderUrl("/users/super_admin/Dashboard")}
          className={`flex w-auto md:w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-2.5 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/super_admin/Dashboard")} ${getItemStyle("/users/super_admin/Dashboard")}`}
        >
          <IconDashboard className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <Link
          href={getLoaderUrl("/users/super_admin/tenants-monitoring")}
          className={`flex w-auto md:w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-2.5 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/super_admin/tenants-monitoring")} ${getItemStyle("/users/super_admin/tenants-monitoring")}`}
        >
          <IconTenants className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="hidden sm:inline">Tenants</span>
        </Link>
        <Link
          href={getLoaderUrl("/users/super_admin/system-monitoring")}
          className={`flex w-auto md:w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-2.5 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/super_admin/system-monitoring")} ${getItemStyle("/users/super_admin/system-monitoring")}`}
        >
          <IconSettings className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => {
          handleLogout();
        }}
        disabled={isLoggingOut}
        className="super-admin-logout-button mt-0 md:mt-6 flex items-center justify-center gap-2 rounded-lg border px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white/65 transition hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconSignOut className="h-4 w-4 md:h-5 md:w-5" />
        <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
      </button>
    </aside>
  );
}
