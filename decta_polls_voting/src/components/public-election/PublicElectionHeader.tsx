"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

export function PublicElectionHeader() {
  const { tenant, election, navItems, userContext, basePath } = useElectionPublic();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch(`${basePath}/auth/logout`, { method: 'POST' });
    
    // Clear cookie for server-side layout detection
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    window.location.href = basePath; // reload and clear session state
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--tenant-primary)] shadow-lg border-b border-[var(--tenant-secondary)]/30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {tenant.logo_url && (
            <div className="p-1 bg-white rounded-lg shadow-sm">
              <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 rounded-md object-cover" />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-white font-black text-lg leading-tight drop-shadow-sm">{election.title}</h1>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{tenant.name}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== basePath);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`text-[11px] font-black tracking-[0.15em] uppercase transition-all px-4 py-2 rounded-xl flex items-center gap-2 ${
                  isActive 
                    ? 'bg-white text-[var(--tenant-primary)] shadow-md' 
                    : item.highlight 
                      ? 'bg-[var(--tenant-secondary)] text-white hover:bg-[var(--tenant-third)] shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {userContext ? (
            <div className="flex items-center gap-3 pl-4 border-l border-white/20">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-white">{userContext.name}</span>
                <span className="text-[9px] font-black text-[var(--tenant-secondary)] bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {userContext.userType}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-10 h-10 rounded-xl bg-[var(--tenant-third)] hover:bg-red-500 text-white shadow-md transition-all flex items-center justify-center group"
                title="Log Out"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          ) : (
            <Link 
              href={basePath}
              className="px-6 py-2.5 bg-[var(--tenant-secondary)] hover:bg-[var(--tenant-third)] text-white font-black text-xs tracking-widest uppercase rounded-xl shadow-md transition-all active:scale-95"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
