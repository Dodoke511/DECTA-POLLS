"use client";

import React, { useState } from 'react';
import { Loader2, LogOut, UserCircle } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';

export function PublicElectionHeader() {
  const { tenant, election, siteConfig, userContext, basePath } = useElectionPublic();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoSrc = siteConfig?.logo_url_override || tenant.logo_url;
  const title = siteConfig?.public_title || election.title;

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/logout`, { method: 'POST' });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();

    // Clear cookie for server-side layout detection
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    window.location.href = basePath; // reload and clear session state
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--tenant-primary)] shadow-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {logoSrc && (
            <div className="h-12 w-12 shrink-0 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-white/40">
              <img src={logoSrc} alt={`${title} logo`} className="h-full w-full rounded-full object-cover" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="text-white font-black text-lg sm:text-xl leading-tight drop-shadow-sm truncate">{title}</h1>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest truncate">{tenant.organization || tenant.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {userContext && (
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-2 shadow-sm backdrop-blur-md">
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="hidden md:flex flex-col pr-1">
                <span className="max-w-40 truncate text-xs font-bold text-white">{userContext.name}</span>
                <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">
                  {userContext.userType}
                </span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="h-10 rounded-full bg-white px-3 sm:px-4 text-sm font-black text-[var(--tenant-primary)] shadow-md transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2"
                title="Log Out"
              >
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
