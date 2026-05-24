"use client";

import { useState, type ElementType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, CheckSquare, FileText, Home, Loader2, LogOut, Scale, UsersRound, UserCircle } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';

export function PublicElectionHeader() {
  const { tenant, election, siteConfig, userContext, basePath } = useElectionPublic();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoSrc = siteConfig?.logo_url_override || tenant.logo_url;
  const title = siteConfig?.public_title || election.title;
  const voterNavItems = [
    {
      label: 'Home',
      href: `${basePath}/dashboard`,
      icon: Home,
    },
    {
      label: 'Candidates page',
      href: `${basePath}/candidates`,
      icon: UsersRound,
    },
    {
      label: 'Vote now',
      href: `${basePath}/vote`,
      icon: CheckSquare,
    },
    {
      label: 'Results page',
      href: `${basePath}/results`,
      icon: BarChart3,
    },
  ];
  const candidateNavItems = [
    {
      label: 'Home Page',
      href: basePath,
      icon: Home,
    },
    {
      label: 'Candidacy Page',
      href: `${basePath}/candidate-dashboard?tab=candidacy`,
      icon: FileText,
    },
    {
      label: 'Appeals Page',
      href: `${basePath}/candidate-dashboard?tab=appeals`,
      icon: Scale,
    },
    {
      label: 'Candidates Page',
      href: `${basePath}/candidates`,
      icon: UsersRound,
    },
    {
      label: 'Vote Now',
      href: `${basePath}/vote`,
      icon: CheckSquare,
    },
    {
      label: 'Results Page',
      href: `${basePath}/results`,
      icon: BarChart3,
    },
  ];

  const renderIconNav = (
    items: { label: string; href: string; icon: ElementType }[],
    ariaLabel: string
  ) => (
    <nav className="flex items-center gap-1" aria-label={ariaLabel}>
      {items.map(({ label, href, icon: Icon }) => {
        const [itemPath, itemQuery] = href.split('?');
        const itemSearchParams = new URLSearchParams(itemQuery);
        const isActive =
          pathname === itemPath &&
          (!itemQuery ||
            Array.from(itemSearchParams.entries()).every(([key, value]) => searchParams.get(key) === value));

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:bg-white hover:text-[var(--tenant-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? 'bg-white text-[var(--tenant-primary)] shadow-md' : 'bg-white/10'
              }`}
          >
            <Icon className="h-5 w-5" style={{ color: isActive ? 'var(--tenant-primary)' : undefined }} />
            <div
              className="pointer-events-none absolute left-1/2 top-[calc(100%+0.45rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/60 bg-white px-2.5 py-1.5 text-[10px] font-black leading-none tracking-normal text-[var(--tenant-primary)] opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {label}
            </div>
          </Link>
        );
      })}
    </nav>
  );

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
              <Image
                src={logoSrc}
                alt={`${title} logo`}
                width={48}
                height={48}
                className="h-full w-full rounded-full object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="text-white font-black text-lg sm:text-xl leading-tight drop-shadow-sm truncate">{title}</h1>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest truncate">{tenant.organization || tenant.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {userContext && (
            <div className="flex items-center gap-2">
              {userContext.isVoter && !userContext.isCandidate && (
                renderIconNav(voterNavItems, 'Voter navigation')
              )}
              {userContext.isCandidate && (
                renderIconNav(candidateNavItems, 'Candidate navigation')
              )}

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
            </div>
          )}
        </div>
      </div>
      <div className="h-[2px] w-full bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
    </header>
  );
}
