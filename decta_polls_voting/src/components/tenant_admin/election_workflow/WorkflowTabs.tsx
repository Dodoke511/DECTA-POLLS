import React from 'react';

export function WorkflowTabs() {
  return (
    <div className="flex justify-center bg-[#140B2D]/80 backdrop-blur-md pt-2 border-b border-[#00f0ff]/20">
      <div className="flex gap-16 relative">
        <button className="px-4 py-3 text-[13px] font-bold tracking-widest uppercase text-[#A78BFA] relative">
          Workflow
          {/* Active indicator */}
          <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.8)] rounded-t-sm" />
        </button>
        
        <button className="px-4 py-3 text-[13px] font-bold tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors">
          Appeals
        </button>
        
        <button className="px-4 py-3 text-[13px] font-bold tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors">
          Settings
        </button>
      </div>
    </div>
  );
}
