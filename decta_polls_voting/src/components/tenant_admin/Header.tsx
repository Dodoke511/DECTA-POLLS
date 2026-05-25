"use client";

import React from "react";
import NotificationBell from "../notifications/NotificationBell";

export function TenantAdminHeader() {
  return (
    <header className="relative z-50 flex items-center justify-between border-b border-white/[0.06] px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <img
          src="/decta-logo.png"
          alt="D.E.C.T.A Polls"
          className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0 rounded-full object-contain"
        />
        <span className="text-xs sm:text-sm font-medium tracking-wide text-white/95 truncate">
          <span className="hidden sm:inline">D.E.C.T.A Polls</span>
          <span className="sm:hidden">DECTA</span>
          <span className="text-white/45 mx-1">|</span>
          <span className="hidden md:inline">Tenant Admin</span>
          <span className="md:hidden">Tenant</span>
        </span>
      </div>
      <div className="flex items-center pr-2">
        <NotificationBell />
      </div>
    </header>
  );
}
