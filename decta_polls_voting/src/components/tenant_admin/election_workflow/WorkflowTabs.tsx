import React from 'react';

interface WorkflowTabsProps {
  activeTab?: 'workflow' | 'appeals' | 'interface';
  onTabChange?: (tab: 'workflow' | 'appeals' | 'interface') => void;
  isAppealsVisible?: boolean;
  canUseInterface?: boolean;
  isInterfaceVisible?: boolean;
}

export function WorkflowTabs({
  activeTab = 'workflow',
  onTabChange,
  isAppealsVisible = false,
  canUseInterface = true,
  isInterfaceVisible = true,
}: WorkflowTabsProps) {
  const tabs = [
    { id: 'workflow' as const, label: 'Workflow' },
    { id: 'appeals' as const, label: 'Appeals' },
    { id: 'interface' as const, label: canUseInterface ? 'Interface' : 'Interface Locked', disabled: !canUseInterface },
  ].filter(tab => {
    if (tab.id === 'appeals') return isAppealsVisible;
    if (tab.id === 'interface') return isInterfaceVisible;
    return true;
  });

  return (
    <div className="flex justify-center bg-[#140B2D]/80 backdrop-blur-md pt-2 border-b border-white/10">
      <div className="flex gap-12 relative">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange?.(tab.id)}
              disabled={tab.disabled}
              title={tab.disabled ? 'Basic accounts use the predefined public election website.' : undefined}
              className={`px-4 py-3 text-[13px] font-bold tracking-widest uppercase relative transition-colors select-none ${tab.disabled
                  ? 'text-white/18 cursor-not-allowed'
                  : isActive
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
