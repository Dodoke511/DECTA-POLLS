import React from 'react';

interface WorkflowTabsProps {
  activeTab?: 'workflow' | 'appeals' | 'settings';
}

export function WorkflowTabs({ activeTab = 'workflow' }: WorkflowTabsProps) {
  const tabs = [
    { id: 'workflow' as const, label: 'Workflow' },
    { id: 'appeals' as const, label: 'Appeals' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div className="flex justify-center bg-[#140B2D]/80 backdrop-blur-md pt-2 border-b border-white/10">
      <div className="flex gap-12 relative">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={!isActive}
              className={`px-4 py-3 text-[13px] font-bold tracking-widest uppercase relative transition-colors select-none ${
                isActive
                  ? 'text-[#A78BFA]'
                  : 'text-white/30 cursor-default'
              }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.8)] rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
