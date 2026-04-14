"use client";

import React from "react";
import Link from "next/link";
import { IconDashboard, IconElections, IconCandidates, IconVoters, IconSettings, IconSignOut } from "./Icons";
import { useRouter } from "next/navigation";
import { PermissionProvider, usePermissions } from "@/components/providers/PermissionProvider";
import { PERMISSIONS_COOKIE, ROLE_COOKIE } from "@/lib/permissions";

interface SidebarProps {
  activePath: string;
}

export function TenantAdminSidebar({ activePath }: SidebarProps) {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setToken(sessionStorage.getItem('tenantToken'));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('tenantToken');
    sessionStorage.removeItem('tenantEmail');
    // Clear permission cookies
    document.cookie = `${PERMISSIONS_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${ROLE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    router.push('/loading?destination=/');
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
    return `${path}?role=tenant&random=${token}`;
  };

  return (
    <PermissionProvider>
      <SidebarInner
        activePath={activePath}
        token={token}
        isLoggingOut={isLoggingOut}
        handleLogout={handleLogout}
        getItemStyle={getItemStyle}
        getTextStyle={getTextStyle}
        getUrlWithToken={getUrlWithToken}
      />
    </PermissionProvider>
  );
}

function SidebarInner({
  activePath,
  token,
  isLoggingOut,
  handleLogout,
  getItemStyle,
  getTextStyle,
  getUrlWithToken,
}: {
  activePath: string;
  token: string | null;
  isLoggingOut: boolean;
  handleLogout: () => void;
  getItemStyle: (path: string) => string;
  getTextStyle: (path: string) => string;
  getUrlWithToken: (path: string) => string;
}) {
  const { canAccess, isLoaded } = usePermissions();

  return (
    <aside className="super-admin-sidebar flex w-full shrink-0 flex-col rounded-3xl border md:w-[220px] lg:w-[260px] md:rounded-r-none py-6 md:py-8 pl-4 md:pl-5 pr-3 md:pr-4">
      <div className="mb-8 md:mb-10 px-2 text-center">
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
          Tenant Admin
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 md:gap-2.5" role="navigation" aria-label="Main Navigation">
        {/* Dashboard — always visible */}
        <Link
          href={getUrlWithToken("/users/tenant/dashboard")}
          className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/tenant/dashboard")} ${getItemStyle("/users/tenant/dashboard")}`}
        >
          <IconDashboard className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        {/* Elections */}
        {(!isLoaded || canAccess("/users/tenant/elections")) && (
          <Link
            href={getUrlWithToken("/users/tenant/elections")}
            className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/tenant/elections")} ${getItemStyle("/users/tenant/elections")}`}
          >
            <IconElections className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="hidden sm:inline">Elections</span>
          </Link>
        )}

        {/* Candidates */}
        {(!isLoaded || canAccess("/users/tenant/candidates")) && (
          <Link
            href={getUrlWithToken("/users/tenant/candidates")}
            className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/tenant/candidates")} ${getItemStyle("/users/tenant/candidates")}`}
          >
            <IconCandidates className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="hidden sm:inline">Candidates</span>
          </Link>
        )}

        {/* Voters */}
        {(!isLoaded || canAccess("/users/tenant/voters")) && (
          <Link
            href={getUrlWithToken("/users/tenant/voters")}
            className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/tenant/voters")} ${getItemStyle("/users/tenant/voters")}`}
          >
            <IconVoters className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="hidden sm:inline">Voters</span>
          </Link>
        )}

        {/* Settings */}
        {(!isLoaded || canAccess("/users/tenant/settings")) && (
          <Link
            href={getUrlWithToken("/users/tenant/settings")}
            className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle("/users/tenant/settings")} ${getItemStyle("/users/tenant/settings")}`}
          >
            <IconSettings className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="super-admin-logout-button mt-4 md:mt-6 flex items-center justify-center gap-2 rounded-lg border px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-white/65 transition hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconSignOut className="h-4 w-4 md:h-5 md:w-5" />
        <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
      </button>
    </aside>
  );
}
