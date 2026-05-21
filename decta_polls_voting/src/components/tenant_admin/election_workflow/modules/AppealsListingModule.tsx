'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Search, Filter, Clock, CheckCircle2, XCircle, UserCheck, UserX, MessageSquare, FileText } from 'lucide-react';

interface AppealDetail {
  label: string;
  value: string;
}

interface Appeal {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  reason: string;
  details?: AppealDetail[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AppealsModuleProps {
  electionId: string;
}

export function AppealsModule({ electionId }: AppealsModuleProps) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const res = await fetch(`/api/workflow/get_appeals?electionId=${electionId}`);
        if (res.ok) {
          const data = await res.json();
          setAppeals(data.appeals ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch appeals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppeals();
  }, [electionId]);

  const handleAppealDecision = async (appealId: string, decision: 'approved' | 'rejected') => {
    setActionLoading(appealId);
    try {
      const res = await fetch('/api/workflow/decide_appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appealId, decision }),
      });
      if (res.ok) {
        setAppeals(prev => prev.map(a =>
          a.id === appealId ? { ...a, status: decision } : a
        ));
      }
    } catch (err) {
      console.error('Failed to update appeal:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAppeals = appeals.filter(a => {
    const matchesFilter = filter === 'all' || a.status === filter;
    const matchesSearch = a.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.candidateEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
        <p className="text-white/30 text-sm font-medium uppercase tracking-widest">Loading Appeals...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Appeal Review Panel</h2>
          <p className="text-[12px] text-white/40 mt-1">Review and decide on candidate appeals against screening decisions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search appeals..."
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#6648EB] transition-all w-56"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-[#6648EB] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appeals List */}
      {filteredAppeals.length > 0 ? (
        <div className="space-y-4">
          {filteredAppeals.map((appeal) => (
            <div
              key={appeal.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-start justify-between gap-6">
                {/* Left: Appeal Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6648EB] to-[#A78BFA] flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20 flex-shrink-0">
                    {appeal.candidateName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-white font-bold">{appeal.candidateName}</p>
                      {appeal.status === 'pending' && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />
                          Pending
                        </div>
                      )}
                      {appeal.status === 'approved' && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Approved
                        </div>
                      )}
                      {appeal.status === 'rejected' && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                          <XCircle className="w-2.5 h-2.5" />
                          Rejected
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mb-3">{appeal.candidateEmail}</p>

                    {/* Appeal Reason */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare className="w-3 h-3 text-white/30" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Appeal Details</span>
                      </div>
                      {appeal.details?.length ? (
                        <div className="space-y-3">
                          {appeal.details.map((detail) => (
                            <div key={`${detail.label}-${detail.value}`} className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{detail.label}</p>
                              <p className="text-sm text-white/70 break-words">{detail.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/70 leading-relaxed">{appeal.reason || 'No reason provided.'}</p>
                      )}
                      {appeal.details?.length ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAppeal(appeal)}
                          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-300 hover:text-white"
                        >
                          View full appeal
                        </button>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-white/20 mt-2">
                      Filed {new Date(appeal.createdAt).toLocaleDateString()} at {new Date(appeal.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                {appeal.status === 'pending' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleAppealDecision(appeal.id, 'approved')}
                      disabled={actionLoading === appeal.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 text-xs font-bold"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAppealDecision(appeal.id, 'rejected')}
                      disabled={actionLoading === appeal.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95 disabled:opacity-50 text-xs font-bold"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/15">
              <FileText className="w-10 h-10" />
            </div>
            <div>
              <p className="text-white/50 font-medium">No appeals found</p>
              <p className="text-white/25 text-sm mt-1">
                {filter !== 'all'
                  ? `No ${filter} appeals match your criteria.`
                  : 'No candidate appeals have been submitted yet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="max-w-3xl w-full rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Appeal details for {selectedAppeal.candidateName}</h3>
                <p className="text-sm text-white/40">{selectedAppeal.candidateEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/[0.05] p-4 border border-white/10">
                  <p className="text-[11px] uppercase tracking-widest text-white/40">Status</p>
                  <p className="mt-2 text-sm text-white">{selectedAppeal.status}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] p-4 border border-white/10">
                  <p className="text-[11px] uppercase tracking-widest text-white/40">Filed</p>
                  <p className="mt-2 text-sm text-white">{new Date(selectedAppeal.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white/[0.05] p-5 border border-white/10">
                <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-widest">Submitted responses</h4>
                {selectedAppeal.details?.length ? (
                  <div className="space-y-3">
                    {selectedAppeal.details.map((detail) => (
                      <div key={`${detail.label}-${detail.value}`} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{detail.label}</p>
                        <p className="text-sm text-white/70 break-words">{detail.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">No appeal form responses were available to display.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
