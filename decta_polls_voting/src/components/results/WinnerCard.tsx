import React from 'react';
import Image from 'next/image';
import { Trophy, UserCircle } from 'lucide-react';

interface WinnerCardProps {
  positionTitle: string;
  candidateName: string;
  partyName?: string;
  photoUrl?: string;
  voteCount: number;
  primaryColor?: string;
}

export function WinnerCard({
  positionTitle,
  candidateName,
  partyName,
  photoUrl,
  voteCount,
  primaryColor = '#5D44F8'
}: WinnerCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      {/* Background decoration */}
      <div 
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: primaryColor }}
      />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {positionTitle}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-amber-100 shadow-sm">
              {photoUrl ? (
                <Image src={photoUrl} alt={candidateName} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                  <UserCircle className="h-6 w-6" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {candidateName}
              </h3>
              {partyName && (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {partyName}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-end justify-between">
          <p className="text-xs font-bold text-slate-500">Total Votes Received</p>
          <p className="text-xl font-black text-slate-900" style={{ color: primaryColor }}>
            {voteCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
