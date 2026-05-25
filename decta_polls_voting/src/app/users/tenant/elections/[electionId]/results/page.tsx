import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Trophy, Users, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import BackButton from './BackButton';

export const revalidate = 0; // Disable caching

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function TenantResultsPage({ params }: { params: Promise<{ electionId: string }> }) {
  const { electionId } = await params;

  // 1. Fetch Election Details
  const { data: election, error: electionError } = await supabase
    .from('election')
    .select('*')
    .eq('id', electionId)
    .single();
    
  if (electionError || !election) {
    console.error("Failed to fetch election:", { electionId, electionError, supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  }

  if (electionError || !election) {
    return (
      <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Election Not Found</h1>
          <p className="text-white/60 mb-6">We could not retrieve the details for this election.</p>
          <BackButton label="Back to Dashboard" isErrorState={true} />
        </div>
      </div>
    );
  }

  // 2. Fetch Results with Positions and Candidates
  const { data: results, error: resultsError } = await supabase
    .from('election_results')
    .select(`
      id,
      vote_count,
      rank,
      is_winner,
      abstain_count,
      position:position_id ( id, title, seats ),
      candidate:candidate_id ( id, political_party, user:userID ( first_name, surname ) )
    `)
    .eq('election_id', electionId)
    .order('rank', { ascending: true });

  if (resultsError) {
    console.error("Results error:", resultsError);
  } else {
    console.log("Fetched results length:", results?.length);
  }

  const groupedResults: Record<string, { positionTitle: string, seats: number, candidates: any[], abstainCount: number }> = {};
  
  if (results && !resultsError) {
    results.forEach(res => {
      // res.position is an object or array. Usually object.
      const posId = (res.position as any)?.id;
      if (!posId) return;

      if (!groupedResults[posId]) {
        groupedResults[posId] = {
          positionTitle: (res.position as any)?.title || 'Unknown Position',
          seats: (res.position as any)?.seats_available || 1,
          candidates: [],
          abstainCount: 0
        };
      }
      
      // If candidate is null, this row might just hold the abstain count
      if (!res.candidate) {
        groupedResults[posId].abstainCount += (res.abstain_count || 0);
      } else {
        const user = (res.candidate as any)?.user;
        const name = user ? `${user.first_name} ${user.surname}` : 'Unknown Candidate';
        groupedResults[posId].candidates.push({
          name,
          party: (res.candidate as any)?.political_party || 'INDEPENDENT',
          voteCount: res.vote_count,
          rank: res.rank,
          isWinner: res.is_winner
        });
        // We can also aggregate abstain counts from candidate rows if they hold it
        if (res.abstain_count) {
            groupedResults[posId].abstainCount += res.abstain_count;
        }
      }
    });
  }

  const isFailed = election.status === 'FAILED';
  const isCompleted = election.status === 'COMPLETED';

  return (
    <div className="min-h-screen text-[#f1f0f3] p-8" style={{ background: "radial-gradient(ellipse at 50% 0%, #1e1147 0%, #03070f 80%)" }}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <BackButton label="Back to Elections" />
            <h1 className="text-4xl font-black text-white">{election.title}</h1>
            <div className="flex items-center gap-3 mt-4">
              {isCompleted && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              )}
              {isFailed && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Failed
                </span>
              )}
              <span className="text-white/40 text-sm">Ended on {new Date(election.updated_at || election.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Results Container */}
        {isFailed ? (
          <div className="p-12 rounded-3xl border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center justify-center">
            <XCircle className="w-16 h-16 text-red-500/50 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Election Failed</h2>
            <p className="text-white/50 max-w-lg">This election was marked as failed and no valid results were finalized. Candidates have been downgraded to regular voters.</p>
          </div>
        ) : Object.keys(groupedResults).length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(groupedResults).map((pos, idx) => {
              const totalVotes = pos.candidates.reduce((sum, c) => sum + c.voteCount, 0) + pos.abstainCount;

              return (
                <div key={idx} className="p-6 rounded-3xl border border-white/10 bg-[#110D1E]/80 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                    <Trophy className="w-24 h-24 text-white/10" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1 relative z-10">{pos.positionTitle}</h3>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-6 relative z-10">
                    {pos.seats} {pos.seats === 1 ? 'Seat' : 'Seats'} Available • {totalVotes} Total Votes Cast
                  </p>

                  <div className="space-y-3 relative z-10">
                    {pos.candidates.map((cand, cIdx) => {
                      const percentage = totalVotes > 0 ? Math.round((cand.voteCount / totalVotes) * 100) : 0;
                      return (
                        <div key={cIdx} className={`p-4 rounded-xl border ${cand.isWinner ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${cand.isWinner ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'}`}>
                                {cand.rank}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{cand.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {cand.isWinner && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Elected</span>}
                                  {cand.party && (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${cand.party === 'INDEPENDENT' ? 'text-white/40' : 'text-[#a78bfa]'}`}>{cand.party}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-white">{cand.voteCount}</div>
                              <div className="text-[10px] text-white/40 uppercase tracking-widest">Votes</div>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${cand.isWinner ? 'bg-emerald-500' : 'bg-[#6648EB]'}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    {pos.abstainCount > 0 && (
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                        <div className="flex justify-between items-center">
                          <span className="text-white/50 text-sm font-medium">Abstentions</span>
                          <span className="text-white/50 font-bold">{pos.abstainCount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-3xl border border-white/10 bg-white/5 text-center">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Results Available</h2>
            <p className="text-white/50">There are no computed results for this completed election.</p>
          </div>
        )}

      </div>
    </div>
  );
}
