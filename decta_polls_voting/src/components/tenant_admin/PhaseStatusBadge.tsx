'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Zap } from 'lucide-react';
import { PhaseStatus } from '@/lib/workflow/PhaseResolverService';

interface PhaseStatusBadgeProps {
  status: PhaseStatus | null;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<PhaseStatus, {
  label: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  icon: React.ReactNode;
}> = {
  active: {
    label: 'LIVE',
    dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <Zap className="w-3 h-3" />,
  },
  for_transition: {
    label: 'AWAITING TRANSITION',
    dotClass: 'bg-amber-400 animate-pulse',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  upcoming: {
    label: 'NOT STARTED',
    dotClass: 'bg-white/30',
    textClass: 'text-white/40',
    bgClass: 'bg-white/5 border-white/10',
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    label: 'COMPLETED',
    dotClass: 'bg-teal-400',
    textClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10 border-teal-500/20',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export function PhaseStatusBadge({ status, size = 'sm' }: PhaseStatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${config.bgClass} ${config.textClass}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
        {config.label}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest ${config.bgClass} ${config.textClass}`}>
      {config.icon}
      <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      {config.label}
    </div>
  );
}
