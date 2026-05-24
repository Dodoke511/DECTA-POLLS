import React from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';

interface AbstainOptionProps {
  isSelected: boolean;
  onSelect: () => void;
  primaryColor?: string;
}

export function AbstainOption({
  isSelected,
  onSelect,
  primaryColor = '#5D44F8'
}: AbstainOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative mt-4 w-full overflow-hidden rounded-[20px] border border-dashed p-4 text-left transition-all duration-300 ${
        isSelected 
          ? 'bg-slate-50 border-slate-400 shadow-sm' 
          : 'bg-transparent border-slate-300 hover:bg-slate-50 hover:border-slate-400'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
          <Ban className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-base font-black text-slate-700">Abstain from voting</h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Skip this position. No candidate will receive a vote.
          </p>
        </div>

        <div className="flex-shrink-0">
          <div 
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ${isSelected ? 'bg-slate-600 border-slate-600' : 'border-slate-300 bg-white'}`}
          >
            <CheckCircle2 className={`h-4 w-4 transition-transform duration-300 ${isSelected ? 'scale-100 text-white' : 'scale-0 text-transparent'}`} />
          </div>
        </div>
      </div>
    </button>
  );
}
