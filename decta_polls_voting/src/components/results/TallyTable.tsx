import React from 'react';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';

interface TallyTableProps {
  positionTitle: string;
  results: any[];
  candidates: any[];
  abstainCount: number;
  showCounts?: boolean;
  primaryColor?: string;
}

export function TallyTable({
  positionTitle,
  results,
  candidates,
  abstainCount,
  showCounts = true,
  primaryColor = '#5D44F8'
}: TallyTableProps) {
  
  // Calculate total votes for percentage
  const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0) + abstainCount;
  
  // Sort results by vote count descending
  const sortedResults = [...results].sort((a, b) => b.vote_count - a.vote_count);

  const getPercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 1000) / 10;
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <h3 className="text-lg font-black text-slate-900">{positionTitle}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Total valid votes: {totalVotes.toLocaleString()}
        </p>
      </div>
      
      <div className="divide-y divide-slate-100">
        {sortedResults.map((result, idx) => {
          const cand = candidates.find(c => c.id === result.candidate_id);
          const percentage = getPercentage(result.vote_count);
          
          return (
            <div key={result.candidate_id} className="p-6 transition-colors hover:bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                  {idx + 1}
                </div>
                
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200">
                  {cand?.photo_url ? (
                    <Image src={cand.photo_url} alt={cand.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <UserCircle className="h-5 w-5" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="truncate font-bold text-slate-900">{cand?.name || 'Unknown'}</h4>
                    {showCounts && (
                      <div className="text-right">
                        <span className="font-black text-slate-900">{result.vote_count.toLocaleString()}</span>
                        <span className="ml-2 text-xs font-bold text-slate-500">({percentage}%)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: result.is_winner ? primaryColor : '#94a3b8' 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Abstain Row */}
        {abstainCount > 0 && (
          <div className="bg-slate-50 p-6">
            <div className="flex items-center gap-4 opacity-75">
              <div className="flex h-6 w-6 items-center justify-center text-xs font-black text-slate-400">-</div>
              <div className="h-10 w-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-bold text-slate-600">Abstain</h4>
                  {showCounts && (
                    <div className="text-right">
                      <span className="font-bold text-slate-600">{abstainCount.toLocaleString()}</span>
                      <span className="ml-2 text-xs font-semibold text-slate-400">({getPercentage(abstainCount)}%)</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div 
                    className="h-full rounded-full bg-slate-400 transition-all duration-1000"
                    style={{ width: `${getPercentage(abstainCount)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
