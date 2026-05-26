"use client";

import React from 'react';
import { ElectionPublicProvider } from '@/contexts/ElectionPublicContext';
import { PublicElectionFooter } from '@/components/public-election/PublicElectionFooter';
import { PublicElectionHeader } from '@/components/public-election/PublicElectionHeader';

interface PublicElectionShellProps {
  children: React.ReactNode;
  contextValue: React.ComponentProps<typeof ElectionPublicProvider>['value'];
  primaryColor: string;
  secondaryColor: string;
  thirdColor: string;
}

export function PublicElectionShell({
  children,
  contextValue,
  primaryColor,
  secondaryColor,
  thirdColor,
}: PublicElectionShellProps) {
  return (
    <ElectionPublicProvider value={contextValue}>
      <div
        className="min-h-screen flex flex-col bg-[#FFFFFF] text-slate-900 selection:bg-slate-200"
        style={{
          '--tenant-primary': primaryColor,
          '--tenant-primary-light': `${primaryColor}20`,
          '--tenant-secondary': secondaryColor,
          '--tenant-third': thirdColor,
        } as React.CSSProperties}
      >
        <PublicElectionHeader />
        <main className="flex-1 pt-20">
          {children}
        </main>
        <PublicElectionFooter />
      </div>
    </ElectionPublicProvider>
  );
}
