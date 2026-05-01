import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Navigation } from 'lucide-react';

export function NavigationLabelsSection({ config, onUpdate }: { config: any, onUpdate: (data: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#140B2D]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-[#9A79F8]" />
          <h3 className="text-lg font-bold text-white">Section 4 — Navigation Labels</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-6">
          <p className="text-sm text-white/60 mb-4">
            Customize navigation link labels on your public election site.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Filing Nav Link Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="File Your Candidacy"
                value={config?.nav_filing || ''}
                onChange={(e) => onUpdate({ nav_filing: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Candidates Nav Link Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="Meet the Candidates"
                value={config?.nav_candidates || ''}
                onChange={(e) => onUpdate({ nav_candidates: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Appeal Nav Link Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="Submit an Appeal"
                value={config?.nav_appeal || ''}
                onChange={(e) => onUpdate({ nav_appeal: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Vote Nav Link Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="Cast Your Vote"
                value={config?.nav_vote || ''}
                onChange={(e) => onUpdate({ nav_vote: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Results Nav Link Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="Election Results"
                value={config?.nav_results || ''}
                onChange={(e) => onUpdate({ nav_results: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
