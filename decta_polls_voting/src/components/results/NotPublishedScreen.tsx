import React from 'react';
import { Lock, Clock } from 'lucide-react';

export function NotPublishedScreen({ primaryColor = '#5D44F8' }: { primaryColor?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl border border-slate-100">
        <div className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
          <Lock className="h-4 w-4" />
        </div>
        <Clock className="h-10 w-10 text-slate-300" />
      </div>
      
      <h2 className="text-3xl font-black text-slate-900">Results Not Available</h2>
      <p className="mt-4 max-w-md text-base font-medium text-slate-500 leading-relaxed">
        The election results have not been published yet. Tallying and auditing may still be in progress. 
        Please check back later once administrators release the final certified results.
      </p>
    </div>
  );
}
