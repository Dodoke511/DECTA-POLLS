import React from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ElectionNotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8">
        <div className="relative">
          <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl border border-slate-100 flex items-center justify-center mx-auto relative z-10">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-slate-200/50 rounded-full blur-3xl -z-0" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Poll Not Found</h1>
          <p className="text-slate-500 leading-relaxed">
            The election you are looking for is either in draft mode, has been removed, or the link is incorrect.
          </p>
        </div>

        <div className="pt-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="pt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
            SECURE ELECTION SYSTEM • DECTA
          </p>
        </div>
      </div>
    </div>
  );
}
