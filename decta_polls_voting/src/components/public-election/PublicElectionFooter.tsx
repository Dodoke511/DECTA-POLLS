"use client";

import React from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';

export function PublicElectionFooter() {
  const { tenant } = useElectionPublic();

  return (
    <footer className="border-t border-slate-100 py-8 mt-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.
        </p>
        <p className="text-slate-400 text-xs flex items-center gap-1.5">
          Powered by <span className="font-bold text-slate-500 tracking-widest uppercase">Decta Polls</span>
        </p>
      </div>
    </footer>
  );
}
