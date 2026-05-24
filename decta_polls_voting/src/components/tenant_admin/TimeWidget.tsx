'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck, Globe } from 'lucide-react';

export function TimeWidget() {
  const [time, setTime] = useState<Date | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    setTime(new Date());
    setIsSynced(true);

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative group overflow-hidden rounded-[24px] border border-white/10 bg-[#141026]/40 backdrop-blur-xl p-6 shadow-2xl transition-all hover:border-[#5d44f8]/30">
      {/* ── Background Glow ── */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5d44f8]/10 blur-[80px] transition-all group-hover:bg-[#5d44f8]/20" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">

        {/* ── Left: Time ── */}
        <div className="flex items-center gap-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl">
            <Clock className="w-15 h-15 text-[#a78bfa] animate-pulse" />
            <div className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-2xl font-montserrat">
                {hours}:{minutes}
              </span>
              <span className="text-2xl md:text-3xl font-bold text-white/30 font-montserrat">
                {seconds}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a78bfa]">Central Standard Time</span>
              <div className="h-px w-8 bg-white/10" />
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-white/30" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Global Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Date & Security ── */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 shadow-lg">
            <Calendar className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/80 whitespace-nowrap">{dateStr}</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Election Clock Secure</span>
          </div>
        </div>

      </div>

      {/* ── Bottom Decorative Line ── */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#5d44f8]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
