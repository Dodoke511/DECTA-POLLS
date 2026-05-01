"use client";

import React, { createContext, useContext } from 'react';
import { PhaseState } from '@/lib/public-election/phase-utils';
import { ElectionUserContext } from '@/lib/public-election/session';
import { NavItem } from '@/lib/public-election/nav-builder';

interface ElectionPublicContextType {
  tenant: any;
  election: any;
  siteConfig: any;
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
