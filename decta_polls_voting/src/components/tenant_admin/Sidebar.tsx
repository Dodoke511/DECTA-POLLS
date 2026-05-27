"use client";

import React from "react";
import Link from "next/link";
import { IconDashboard, IconElections, IconCandidates, IconVoters, IconSettings, IconSignOut } from "./Icons";
import { useRouter } from "next/navigation";
import { PermissionProvider, usePermissions } from "@/components/providers/PermissionProvider";
import { PERMISSIONS_COOKIE, ROLE_COOKIE } from "@/lib/permissions";

interface SidebarProps {
  activePath: string;
  isRestricted?: boolean;
}

type TenantNavLinkProps = {
  href: string;
  children: React.ReactNode;
  path: string;
  isRestricted: boolean;
  getItemStyle: (path: string) => string;
  getTextStyle: (path: string) => string;
  getLoaderUrl: (path: string) => string;
};

function TenantNavLink({
  href,
  children,
  path,
  isRestricted,
  getItemStyle,
  getTextStyle,
  getLoaderUrl,
}: TenantNavLinkProps) {
  const isLocked = isRestricted && path !== "/users/tenant/dashboard";

  if (isLocked) {
    return (
      <div className="relative flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium opacity-40 cursor-not-allowed bg-black/20 border border-white/5">
        {children}
        <div className="absolute right-3">
          <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={getLoaderUrl(href)}
      className={`flex w-full items-center justify-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium transition ${getTextStyle(path)} ${getItemStyle(path)}`}
    >
      {children}
    </Link>
  );
}

export function TenantAdminSidebar({ activePath, isRestricted = false }: SidebarProps) {
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
    router.push('/loader?destination=' + encodeURIComponent('/auth/login_form') + '&duration=700');
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

  const getLoaderUrl = (path: string) => {
    return `/loader?destination=${encodeURIComponent(getUrlWithToken(path))}&duration=700`;
  };

  return (
    <PermissionProvider>
      <SidebarInner
        isLoggingOut={isLoggingOut}
        isRestricted={isRestricted}
        handleLogout={handleLogout}
        getItemStyle={getItemStyle}
        getTextStyle={getTextStyle}
        getLoaderUrl={getLoaderUrl}
      />
    </PermissionProvider>
  );
}

function SidebarInner({
  isLoggingOut,
  isRestricted,
  handleLogout,
  getItemStyle,
  getTextStyle,
  getLoaderUrl,
}: {
  isLoggingOut: boolean;
  isRestricted: boolean;
  handleLogout: () => void;
  getItemStyle: (path: string) => string;
  getTextStyle: (path: string) => string;
  getLoaderUrl: (path: string) => string;
}) {
  const { canAccess, isLoaded } = usePermissions();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <aside className={`super-admin-sidebar flex w-full shrink-0 flex-col rounded-3xl border md:w-[220px] lg:w-[260px] md:rounded-r-none pl-4 md:pl-5 pr-4 md:pr-4 transition-all duration-300 ${isOpen ? 'py-5' : 'py-3.5 md:py-8'}`}>
      <div className="flex items-center justify-between md:flex-col md:items-center md:justify-center px-2 mb-0 md:mb-10">
        <div className="text-left md:text-center">
          <p className="plan-title-gradient" style={{
            margin: 0,
            fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
            fontSize: 'clamp(16px, 4vw, 24px)',
            fontWeight: 700,
            lineHeight: 1.1,
            display: "inline-block",
            whiteSpace: "nowrap",
          }}>
            WELCOME!
          </p>
          <p style={{
            color: "var(--color-decta-text)",
            fontSize: 'clamp(10px, 2.5vw, 13px)',
            fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif",
            margin: "2px 0 0",
            opacity: 0.8,
          }} className="md:mt-1.5">
            {isRestricted ? 'Account Pending' : 'Tenant Admin'}
          </p>
        </div>

        {/* Hamburger Menu Button (Mobile Only) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/75 transition hover:text-white md:hidden"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Collapsible content (links + logout button) */}
      <div className={`${isOpen ? "flex animate-in fade-in slide-in-from-top-2 duration-200" : "hidden"} md:flex flex-col flex-1 gap-2 md:gap-2.5 mt-4 md:mt-0`}>
        <div className="flex flex-col gap-2 md:gap-2.5" role="navigation" aria-label="Main Navigation">
          {/* Dashboard — always visible */}
          <TenantNavLink href="/users/tenant/dashboard" path="/users/tenant/dashboard" isRestricted={isRestricted} getItemStyle={getItemStyle} getTextStyle={getTextStyle} getLoaderUrl={getLoaderUrl}>
            <IconDashboard className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span>Dashboard</span>
          </TenantNavLink>

          {/* Elections */}
          {(!isLoaded || canAccess("/users/tenant/elections")) && (
            <TenantNavLink href="/users/tenant/elections" path="/users/tenant/elections" isRestricted={isRestricted} getItemStyle={getItemStyle} getTextStyle={getTextStyle} getLoaderUrl={getLoaderUrl}>
              <IconElections className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              <span>Elections</span>
            </TenantNavLink>
          )}

          {/* Candidates */}
          {(!isLoaded || canAccess("/users/tenant/candidates")) && (
            <TenantNavLink href="/users/tenant/candidates" path="/users/tenant/candidates" isRestricted={isRestricted} getItemStyle={getItemStyle} getTextStyle={getTextStyle} getLoaderUrl={getLoaderUrl}>
              <IconCandidates className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              <span>Candidates</span>
            </TenantNavLink>
          )}

          {/* Voters */}
          {(!isLoaded || canAccess("/users/tenant/voters")) && (
            <TenantNavLink href="/users/tenant/voters" path="/users/tenant/voters" isRestricted={isRestricted} getItemStyle={getItemStyle} getTextStyle={getTextStyle} getLoaderUrl={getLoaderUrl}>
              <IconVoters className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              <span>Voters</span>
            </TenantNavLink>
          )}

          {/* Settings */}
          {(!isLoaded || canAccess("/users/tenant/settings")) && (
            <TenantNavLink href="/users/tenant/settings" path="/users/tenant/settings" isRestricted={isRestricted} getItemStyle={getItemStyle} getTextStyle={getTextStyle} getLoaderUrl={getLoaderUrl}>
              <IconSettings className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              <span>Settings</span>
            </TenantNavLink>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="super-admin-logout-button mt-4 md:mt-6 flex items-center justify-center gap-2 rounded-lg border px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-white/65 transition hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconSignOut className="h-4 w-4 md:h-5 md:w-5" />
          <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
}
