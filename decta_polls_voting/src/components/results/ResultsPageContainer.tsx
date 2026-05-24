import React, { useState, useEffect } from 'react';
import { WinnerCard } from './WinnerCard';
import { TallyTable } from './TallyTable';
import { TurnoutGauge } from './TurnoutGauge';
import { DownloadReportButton } from './DownloadReportButton';
import { NotPublishedScreen } from './NotPublishedScreen';
import { Loader2 } from 'lucide-react';

interface ResultsPageContainerProps {
  tenantSlug: string;
  electionSlug: string;
  primaryColor?: string;
}

export function ResultsPageContainer({
  tenantSlug,
  electionSlug,
  primaryColor = '#5D44F8'
}: ResultsPageContainerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/results`);
        if (!res.ok) {
          if (res.status === 403) {
            // Probably not published yet, or access denied
            const errData = await res.json();
            if (errData.status === 'not_published') {
              setData({ status: 'not_published' });
              return;
            }
          }
          throw new Error('Failed to load results');
        }
        
        const resultData = await res.json();
        setData(resultData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [tenantSlug, electionSlug]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-lg font-bold text-red-800">Error Loading Results</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (data?.status === 'not_published') {
    return <NotPublishedScreen primaryColor={primaryColor} />;
  }

  const { results, positions, candidates, config, stats } = data;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* Header Stats & Download */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="flex-1">
          {config?.show_turnout_stats && stats && (
            <div className="flex gap-8">
              <TurnoutGauge percentage={stats.turnoutPercentage} primaryColor={primaryColor} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Votes Cast</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.totalVotes}</p>
              </div>
            </div>
          )}
        </div>

        {config?.enable_results_download && (
          <DownloadReportButton 
            tenantSlug={tenantSlug} 
            electionSlug={electionSlug} 
            primaryColor={primaryColor} 
          />
        )}
      </div>

      {/* Winner Highlights */}
      {config?.show_winner_prominently && (
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900">Election Winners</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {positions.map((pos: any) => {
              const positionWinners = results.filter((r: any) => r.position_id === pos.id && r.is_winner);
              if (positionWinners.length === 0) return null;
              
              return positionWinners.map((winnerResult: any) => {
                const cand = candidates.find((c: any) => c.id === winnerResult.candidate_id);
                return (
                  <WinnerCard 
                    key={`${pos.id}-${cand?.id}`}
                    positionTitle={pos.title}
                    candidateName={cand?.name || 'Unknown'}
                    partyName={cand?.party_name}
                    photoUrl={cand?.photo_url}
                    voteCount={winnerResult.vote_count}
                    primaryColor={primaryColor}
                  />
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Tally Tables */}
      <div className="space-y-8">
        <h2 className="text-xl font-black text-slate-900">Full Tally Breakdown</h2>
        {positions.map((pos: any) => {
          const positionResults = results.filter((r: any) => r.position_id === pos.id);
          // Get the abstain count for this position. It's stored in every row for that position, just take the first.
          const abstainCount = positionResults.length > 0 ? (positionResults[0].abstain_count || 0) : 0;
          
          return (
            <TallyTable 
              key={pos.id}
              positionTitle={pos.title}
              results={positionResults}
              candidates={candidates}
              abstainCount={abstainCount}
              showCounts={config?.show_vote_counts}
              primaryColor={primaryColor}
            />
          );
        })}
      </div>

    </div>
  );
}
