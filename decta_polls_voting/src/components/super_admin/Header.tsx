import React from "react";

export function SuperAdminHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-3.5 backdrop-blur-md">
      <img
        src="/decta-logo.png"
        alt="D.E.C.T.A Polls"
        className="h-18 w-18 shrink-0 rounded-full object-contain"
      />
      <span className="text-sm font-medium tracking-wide text-white/95">
        D.E.C.T.A Polls <span className="text-white/45">|</span> Tenant Admin
      </span>
    </header>
  );
}
