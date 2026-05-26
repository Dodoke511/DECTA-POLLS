"use client";

import { useState, useEffect, type ElementType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, CheckSquare, FileText, Home, Loader2, LogOut, Scale, UsersRound, UserCircle, CheckCircle2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';
import { isPhaseActive } from '@/lib/public-election/phase-utils';

export function PublicElectionHeader() {
  const { tenant, election, siteConfig, userContext, basePath, phases } = useElectionPublic();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [showAlreadyVotedModal, setShowAlreadyVotedModal] = useState(false);

  useEffect(() => {
    if (userContext?.isVoter && tenant?.slug && election?.slug) {
      fetch(`/api/public/${tenant.slug}/${election.slug}/vote/status`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'already_voted') {
            setHasVoted(true);
          } else {
            setHasVoted(false);
          }
        })
        .catch(err => console.error("Error fetching vote status:", err));
    }
  }, [userContext, tenant?.slug, election?.slug]);

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

        const isVoteItem = label.toLowerCase().includes('vote');

        const handleClick = (e: React.MouseEvent) => {
          if (isVoteItem && hasVoted === true) {
            e.preventDefault();
            setShowAlreadyVotedModal(true);
          }
        };

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={handleClick}
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

  const isVotingActive = isPhaseActive(phases || [], 'voting');

  if (pathname.endsWith('/vote') && isVotingActive && hasVoted === false) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--tenant-primary)] shadow-lg border-b border-white/10">
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

      {showAlreadyVotedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/65 bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.25)] backdrop-blur-2xl animate-in zoom-in-95 duration-200">
            {/* Decorative top gradient bar */}
            <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-[var(--tenant-primary)] via-[var(--tenant-third)] to-[var(--tenant-secondary)]" />
            
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Voting Completed</h2>
            <p className="mt-3 text-sm font-semibold text-slate-700 leading-relaxed">
              You have already successfully cast your vote in this election! Our system only allows one submitted ballot per voter to maintain election integrity.
            </p>
            
            <div className="mt-6">
              <button
                onClick={() => setShowAlreadyVotedModal(false)}
                className="w-full rounded-2xl bg-[var(--tenant-primary)] py-3.5 text-sm font-black text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer focus:outline-none"
              >
                Got it, thank you!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
