import React from 'react';
import { CheckCircle2, UserCircle } from 'lucide-react';
import Image from 'next/image';

interface CandidateSelectionCardProps {
  candidateId: string;
  name: string;
  partyName?: string;
  photoUrl?: string;
  isSelected: boolean;
  onSelect: () => void;
  primaryColor?: string;
}

export function CandidateSelectionCard({
  candidateId,
  name,
  partyName,
  photoUrl,
  isSelected,
  onSelect,
  primaryColor = '#5D44F8'
}: CandidateSelectionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-300 ${
        isSelected 
          ? 'bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.12)] -translate-y-1' 
          : 'bg-white/60 border-white/65 hover:bg-white/80 hover:-translate-y-0.5 hover:shadow-md'
      }`}
      style={{
        borderColor: isSelected ? primaryColor : undefined,
      }}
    >
      {/* Background Glow when Selected */}
      {isSelected && (
        <div 
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundColor: primaryColor }}
        />
      )}

      <div className="flex items-center gap-4">
        {/* Photo or Placeholder */}
        <div className={`relative h-16 w-16 overflow-hidden rounded-full border-2 shadow-sm transition-colors ${isSelected ? 'border-transparent' : 'border-white/80'}`}
             style={{ borderColor: isSelected ? primaryColor : undefined }}>
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
              <UserCircle className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Candidate Details */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-black truncate transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
            {name}
          </h3>
          {partyName && (
            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest truncate ${partyName === 'INDEPENDENT' ? 'text-slate-400' : 'text-[var(--tenant-primary)] opacity-80'}`}>
              {partyName}
            </p>
          )}
        </div>

        {/* Selection Indicator */}
        <div className="flex-shrink-0">
          <div 
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${isSelected ? 'bg-transparent' : 'border-slate-200 bg-white'}`}
            style={{ 
              borderColor: isSelected ? primaryColor : undefined,
              backgroundColor: isSelected ? primaryColor : undefined 
            }}
          >
            <CheckCircle2 className={`h-5 w-5 transition-transform duration-300 ${isSelected ? 'scale-100 text-white' : 'scale-0 text-transparent'}`} />
          </div>
        </div>
      </div>
    </button>
  );
}
