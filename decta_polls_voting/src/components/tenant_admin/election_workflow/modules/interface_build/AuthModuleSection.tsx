import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LogIn } from 'lucide-react';

export function AuthModuleSection({ config, onUpdate }: { config: any, onUpdate: (data: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#140B2D]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <LogIn className="w-5 h-5 text-[#9A79F8]" />
          <h3 className="text-lg font-bold text-white">Section 2 — Registration & Login Module</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-6">
          <p className="text-sm text-white/60 mb-4">
            This module is always visible on your election site. Candidates register here during filing. Voters log in here.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80 uppercase tracking-wider">Module Heading</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="Join the Election"
                value={config?.auth_module_heading || ''}
                onChange={(e) => onUpdate({ auth_module_heading: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80 uppercase tracking-wider">Candidate Button Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="I am a Candidate"
                value={config?.candidate_reg_label || ''}
                onChange={(e) => onUpdate({ candidate_reg_label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80 uppercase tracking-wider">Voter Button Label</label>
              <input
                type="text"
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                placeholder="I am a Voter"
                value={config?.voter_login_label || ''}
                onChange={(e) => onUpdate({ voter_login_label: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5 mt-1"
                  checked={config?.candidate_reg_enabled ?? true}
                  onChange={(e) => onUpdate({ candidate_reg_enabled: e.target.checked })}
                />
                <div>
                  <span className="text-white/80 text-sm font-bold block">Allow new candidate registrations</span>
                  <span className="text-white/50 text-xs block mt-1">
                    Automatically disabled when filing phase ends. You can also manually disable it here.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
