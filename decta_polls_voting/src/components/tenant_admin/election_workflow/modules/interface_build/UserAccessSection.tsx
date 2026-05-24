import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Users, Vote, ShieldCheck } from 'lucide-react';

export function UserAccessSection({ 
  config, 
  onUpdate,
  subscription = 'BASIC'
}: { 
  config: any, 
  onUpdate: (data: any) => void,
  subscription?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isBasic = subscription === 'BASIC';

  return (
    <div className="bg-[#140B2D]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#9A79F8]" />
          <h3 className="text-lg font-bold text-white">Section 3 — User Access Control</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Voter Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#A78BFA] mb-4">
              <Vote className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">Voter Permissions</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                <input 
                  type="checkbox" 
                  className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5 mt-1"
                  checked={config?.voter_can_view_candidates ?? true}
                  onChange={(e) => onUpdate({ voter_can_view_candidates: e.target.checked })}
                />
                <div>
                  <span className="text-white/80 text-sm font-bold block">View Candidates</span>
                  <span className="text-white/40 text-[11px] block mt-1">
                    Allow voters to see the list of registered candidates.
                  </span>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-4 rounded-xl border transition-colors ${isBasic ? 'opacity-40 cursor-not-allowed bg-black/20 border-white/5' : 'cursor-pointer bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}>
                <input 
                  type="checkbox" 
                  className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5 mt-1"
                  checked={isBasic ? false : (config?.voter_can_view_stats ?? true)}
                  disabled={isBasic}
                  onChange={(e) => onUpdate({ voter_can_view_stats: e.target.checked })}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm font-bold">Live Statistics</span>
                    {isBasic && <Lock className="w-3 h-3 text-[#A78BFA]" />}
                  </div>
                  <span className="text-white/40 text-[11px] block mt-1">
                    {isBasic ? 'Requires Standard subscription.' : 'Allow voters to see real-time voting trends.'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* Candidate Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#A78BFA] mb-4">
              <Users className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">Candidate Permissions</span>
            </div>

            <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
              <input 
                type="checkbox" 
                className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5 mt-1"
                checked={config?.candidate_can_view_results ?? true}
                onChange={(e) => onUpdate({ candidate_can_view_results: e.target.checked })}
              />
              <div>
                <span className="text-white/80 text-sm font-bold block">View Full Results</span>
                <span className="text-white/40 text-[11px] block mt-1">
                  Allow candidates to see the detailed breakdown of election results once tallied.
                </span>
              </div>
            </label>
          </div>

        </div>
      )}
    </div>
  );
}
