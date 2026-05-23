import React from 'react';
import { ShieldCheck, ChevronRight, AlertCircle, Fingerprint } from 'lucide-react';

interface ReviewScreenProps {
  selections: Record<string, any>;
  positions: any[];
  candidates: any[]; // all candidates to lookup names
  onSubmit: () => void;
  onEdit: (positionIndex: number) => void;
  isSubmitting: boolean;
  primaryColor?: string;
  tenantSlug: string;
}

export function ReviewScreen({
  selections,
  positions,
  candidates,
  onSubmit,
  onEdit,
  isSubmitting,
  primaryColor = '#5D44F8',
  tenantSlug
}: ReviewScreenProps) {
  
  const getSelectionDisplay = (selection: any, positionId: string) => {
    if (!selection || selection === 'abstain') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          <AlertCircle className="h-3.5 w-3.5" />
          Abstained
        </span>
      );
    }

    if (Array.isArray(selection)) {
      // Ranked voting
      return (
        <div className="space-y-2">
          {selection.map((s, i) => {
            const candidate = candidates.find(c => c.id === s.candidate_id);
            return (
              <div key={s.candidate_id} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                  {s.rank}
                </span>
                <span className="font-semibold text-slate-800">
                  {candidate?.name || 'Unknown Candidate'}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // Standard voting
    const candidate = candidates.find(c => c.id === selection);
    return (
      <span className="font-bold text-slate-900">
        {candidate?.name || 'Unknown Candidate'}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div 
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900">Review Your Ballot</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Please verify your selections carefully. Once submitted, your vote is encrypted and cannot be changed.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-500">
             <Fingerprint className="h-4 w-4" />
             <span className="text-xs font-bold uppercase tracking-widest">End-to-End Encrypted</span>
           </div>
        </div>
        <div className="divide-y divide-slate-100">
          {positions.map((position, idx) => (
            <div key={position.id} className="group flex items-center justify-between p-6 transition-colors hover:bg-slate-50">
              <div className="flex-1 pr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {position.title}
                </p>
                <div className="mt-2">
                  {getSelectionDisplay(selections[position.id], position.id)}
                </div>
              </div>
              <button
                onClick={() => onEdit(idx)}
                className="flex items-center gap-1 text-sm font-bold text-slate-400 opacity-0 transition-all hover:text-slate-600 group-hover:opacity-100"
              >
                Edit
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pt-4">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full max-w-sm rounded-full px-8 py-4 text-base font-black text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl disabled:pointer-events-none disabled:opacity-50"
          style={{ backgroundColor: primaryColor, boxShadow: `0 20px 40px ${primaryColor}40` }}
        >
          {isSubmitting ? 'Encrypting & Submitting...' : 'Submit Official Ballot'}
        </button>
      </div>
    </div>
  );
}
