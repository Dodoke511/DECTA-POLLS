"use client";

import React, { createContext, useContext } from 'react';
import { PhaseState } from '@/lib/public-election/phase-utils';
import { ElectionUserContext } from '@/lib/public-election/session';
import { NavItem } from '@/lib/public-election/nav-builder';

interface PublicTenant {
  id: string;
  slug: string;
  name: string;
  organization?: string | null;
  logo_url?: string | null;
  main_color?: string | null;
  secondary_color?: string | null;
  third_color?: string | null;
  subscription?: string | null;
  [key: string]: unknown;
}

interface PublicElection {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  banner?: string | null;
  [key: string]: unknown;
}

interface PublicElectionSiteConfig {
  logo_url_override?: string | null;
  public_title?: string | null;
  banner_url?: string | null;
  tagline?: string | null;
  welcome_message?: string | null;
  candidate_can_view_results?: boolean | null;
  voter_can_view_candidates?: boolean | null;
  candidate_reg_enabled?: boolean | null;
  auth_module_heading?: string | null;
  voter_login_label?: string | null;
  candidate_reg_label?: string | null;
  [key: string]: unknown;
}

interface ElectionPublicContextType {
  tenant: PublicTenant;
  election: PublicElection;
  siteConfig: PublicElectionSiteConfig | null;
  phases: PhaseState[];
  brandColor: string;
  navItems: NavItem[];
  userContext: ElectionUserContext | null;
  basePath: string;
}

const ElectionPublicContext = createContext<ElectionPublicContextType | null>(null);

export function ElectionPublicProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: ElectionPublicContextType;
}) {
  return (
    <ElectionPublicContext.Provider value={value}>
      {children}
    </ElectionPublicContext.Provider>
  );
}

export function useElectionPublic() {
  const context = useContext(ElectionPublicContext);
  if (!context) {
    throw new Error('useElectionPublic must be used within an ElectionPublicProvider');
  }
  return context;
}
