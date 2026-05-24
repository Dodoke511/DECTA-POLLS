'use client'

import React, { useState, useEffect, useCallback } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import {
  UserCheck, UserX, Clock, Search, Filter, CheckCircle2, XCircle,
  FileText, Eye, ExternalLink, Loader2, ChevronDown, Info
} from "lucide-react";
import { PhaseGuardBanner } from "@/components/tenant_admin/PhaseGuardBanner";
import { PhaseStatusBadge } from "@/components/tenant_admin/PhaseStatusBadge";
import { PhaseStatus } from "@/lib/workflow/PhaseResolverService";
import { resolvePhaseStatusClient } from "@/lib/workflow/phase-guards";
import { isPhaseAllowed } from "@/lib/workflow/phase-guards";
import { ApplicationViewerModal } from "@/components/tenant_admin/ApplicationViewerModal";
import { Undo2, AlertCircle, FileEdit } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export default function TenantCandidatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [token, setToken] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Phase-aware state
  const [currentPhaseType, setCurrentPhaseType] = useState<string | null>(null);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus | null>(null);
  const [electionId, setElectionId] = useState<string | null>(null);

  // Viewer, Subscription, and Screening state
  const [viewerCandidate, setViewerCandidate] = useState<any>(null);
  const [tenantSubscription, setTenantSubscription] = useState('BASIC');
  const [isScreeningEnabled, setIsScreeningEnabled] = useState(false);
  const [undoStack, setUndoStack] = useState<{ candidateId: string; oldStatus: string; timerId: NodeJS.Timeout }[]>([]);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectAction, setRejectAction] = useState<'retain' | 'remove'>('retain');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    const storedUserId = sessionStorage.getItem('tenantUserId') || '';
    setTenantId(storedUserId);
    setToken(storedToken || '');

    if (storedUserId) {
      fetchCandidates(storedUserId);
      fetchPhaseData(storedUserId);
    } else {
      setLoading(false);
    }
  }, [router]);

  const fetchCandidates = async (id: string) => {
    try {
      const res = await authFetch(`/api/interface/candidates/get_management?tenantId=${id}`);
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
      }
      if (data.subscription) {
        setTenantSubscription(data.subscription);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhaseData = async (tenantUserId: string) => {
    try {
      const electionsRes = await authFetch(`/api/get_tenant_elections?tenantId=${tenantUserId}`);
      const electionsData = await electionsRes.json();
      const elections = electionsData?.elections ?? [];
      const active = elections.find((e: any) => e.status === 'ACTIVE') || null;

      if (!active) return;
      setElectionId(active.id);

      const phaseRes = await authFetch(`/api/workflow/current_phase?electionId=${active.id}`);
      const phaseData = await phaseRes.json();

      if (phaseData.phase_type) {
        setCurrentPhaseType(phaseData.phase_type);
        setPhaseStatus(phaseData.status || 'active');
        setIsScreeningEnabled(phaseData.screening_enabled ?? false);
      }
    } catch (err) {
      console.error("Failed to fetch phase data:", err);
    }
  };

  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    setActionLoading(`${candidateId}-${newStatus}`);
    try {
      const candidate = candidates.find(c => c.id === candidateId);
      const oldStatus = candidate?.status;

      const res = await authFetch('/api/interface/candidates/update_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, status: newStatus })
      });

      if (res.ok) {
        setCandidates(prev => prev.map(c =>
          c.id === candidateId ? { ...c, status: newStatus } : c
        ));

        // Add to undo stack if it's an action
        if (oldStatus && newStatus !== 'ACKNOWLEDGED' && newStatus !== 'PENDING_VERIFICATION') {
          setUndoStack(prev => {
            const existing = prev.find(u => u.candidateId === candidateId);
            if (existing) clearTimeout(existing.timerId);
            return prev.filter(u => u.candidateId !== candidateId);
          });

          const timerId = setTimeout(() => {
            setUndoStack(prev => prev.filter(u => u.candidateId !== candidateId));
          }, 150000); // 2.5 minutes

          setUndoStack(prev => [...prev, { candidateId, oldStatus, timerId }]);
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = async (candidateId: string) => {
    const undoAction = undoStack.find(u => u.candidateId === candidateId);
    if (!undoAction) return;

    clearTimeout(undoAction.timerId);
    setUndoStack(prev => prev.filter(u => u.candidateId !== candidateId));

    await handleStatusUpdate(candidateId, undoAction.oldStatus);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      // 1. Reject the candidate
      await handleStatusUpdate(rejectTarget.id, 'REJECTED');

      // 2. If removing from org, also change user_type to remove them
      if (rejectAction === 'remove' && rejectTarget.user?.id) {
        await authFetch('/api/interface/candidates/update_status', {
          method: 'POST',
          body: JSON.stringify({
            candidateId: rejectTarget.id,
            status: 'REJECTED',
            removeFromOrg: true,
            userId: rejectTarget.user.id,
          })
        });
      } else if (rejectAction === 'retain' && rejectTarget.user?.id) {
        // Retain as voter — update user_type
        await authFetch('/api/interface/candidates/update_status', {
          method: 'POST',
          body: JSON.stringify({
            candidateId: rejectTarget.id,
            status: 'REJECTED',
            retainAsVoter: true,
            userId: rejectTarget.user.id,
          })
        });
      }

      setRejectTarget(null);
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesFilter = filter === 'ALL' || c.status === filter;
    const fullName = `${c.user?.first_name} ${c.user?.surname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      c.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.election?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Phase-dependent flags
  const isFilingPhase = currentPhaseType === 'filing';
  const isScreeningPhase = currentPhaseType === 'screening';
  const isAppealPhase = currentPhaseType === 'appeal';
  const isReadOnly = currentPhaseType === 'voting' || currentPhaseType === 'results';
  const isTransitionPending = phaseStatus === 'for_transition';

  const canModifyStatus = (!isScreeningEnabled || (isScreeningPhase && phaseStatus === 'active')) && !isReadOnly;

  // Allow tenant admins to act on candidates returned to PENDING_VERIFICATION
  // by the appeal workflow even during the appeal phase. This keeps the
  // global protections (lock during voting/results) but lets admins
  // re-process candidates who were returned to screening after an appeal.
  const canActOnPendingDuringAppeal = isAppealPhase;

  const phaseLabel = currentPhaseType
    ? currentPhaseType.charAt(0).toUpperCase() + currentPhaseType.slice(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 font-medium tracking-widest uppercase text-xs">Synchronizing Records...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/candidates" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>
                  Candidate Gatekeeper
                </h1>
                {phaseStatus && <PhaseStatusBadge status={phaseStatus} size="sm" />}
              </div>
              <p className="text-white/40 text-sm mt-1">
                {isFilingPhase && "Viewing filed candidates and their application data. Approvals are locked during Filing."}
                {isScreeningPhase && "Review and approve or reject candidate registrations."}
                {isAppealPhase && "Candidate decisions are locked. Handle appeals in the workflow."}
                {isReadOnly && `Candidate management is read-only during the ${phaseLabel} phase.`}
                {!currentPhaseType && "Verify and manage candidate registrations across your elections."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--tenant-primary)] transition-all w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['ALL', 'PENDING_VERIFICATION', 'APPROVED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[var(--tenant-primary)] text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                      }`}
                  >
                    {f === 'PENDING_VERIFICATION' ? 'Pending' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phase Guard Banners */}
          {isReadOnly && (
            <PhaseGuardBanner
              phaseStatus={null}
              currentPhaseName={phaseLabel || ''}
              isWrongPhase={true}
              message="Candidate management is locked"
            />
          )}
          {isTransitionPending && (
            <PhaseGuardBanner phaseStatus="for_transition" />
          )}
          {isFilingPhase && (
            <div className="mb-6 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-sky-400">Filing Phase — Read Only</p>
                <p className="text-xs text-sky-400/60 mt-0.5">Candidates are currently filing their applications. Approval actions will be available during the Screening phase.</p>
              </div>
            </div>
          )}
          {isAppealPhase && electionId && (
            <div className="mb-6 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/15 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-400">Appeal Phase Active</p>
                  <p className="text-xs text-purple-400/60 mt-0.5">Candidate approvals are locked. Handle appeals in the workflow appeals tab.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  router.push(`/users/tenant/elections/${electionId}/workflow?role=tenant&random=${params.get('random')}&tab=appeals`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 transition-all text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Appeals
              </button>
            </div>
          )}

          <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl ${(isReadOnly || isTransitionPending) ? 'opacity-60 pointer-events-none' : ''}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Candidate Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Position</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Election</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Filed Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40 text-center">Application</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--tenant-primary)] to-[#A78BFA] flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20">
                            {c.user?.first_name?.[0]}{c.user?.surname?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-white">{c.user?.first_name} {c.user?.surname}</div>
                            <div className="text-xs text-white/40">{c.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 font-medium">
                        {c.position || <span className="text-white/20 italic">Not specified</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                          <span className="text-xs font-medium text-white/80">{c.election?.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/40">
                        {c.filedDate ? new Date(c.filedDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setViewerCandidate(c)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 rounded-xl border border-white/10 transition-all inline-flex"
                          title="View Application"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {c.status === 'PENDING_VERIFICATION' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending
                          </div>
                        )}
                        {c.status === 'APPROVED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                        {c.status === 'ACKNOWLEDGED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Acknowledged
                          </div>
                        )}
                        {c.status === 'REJECTED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </div>
                        )}
                        {c.status === 'FLAGGED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 text-orange-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                            <AlertCircle className="w-3 h-3" />
                            Flagged
                          </div>
                        )}
                        {c.status === 'DISQUALIFIED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            Disqualified
                          </div>
                        )}
                        {(c.status === 'DRAFT' || !c.status) && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-white/30 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10">
                            <FileEdit className="w-3 h-3" />
                            To Apply
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">

                          {/* Action Buttons (Accept/Reject) */}
                          {(c.status === 'PENDING_VERIFICATION' || c.status === 'ACKNOWLEDGED' || c.status === 'FLAGGED') && (canModifyStatus || ((c.status === 'PENDING_VERIFICATION' || c.status === 'FLAGGED') && canActOnPendingDuringAppeal)) && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStatusUpdate(c.id, 'APPROVED')}
                                disabled={actionLoading?.startsWith(c.id)}
                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                                title="Approve Candidate"
                              >
                                {actionLoading === `${c.id}-APPROVED` ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => isScreeningPhase ? setRejectTarget(c) : handleStatusUpdate(c.id, 'REJECTED')}
                                disabled={actionLoading?.startsWith(c.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                title="Reject Application"
                              >
                                {actionLoading === `${c.id}-REJECTED` ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                              </button>
                            </div>
                          )}

                          {/* Disqualify Button for Approved Candidates */}
                          {c.status === 'APPROVED' && canModifyStatus && !undoStack.find(u => u.candidateId === c.id) && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStatusUpdate(c.id, 'DISQUALIFIED')}
                                disabled={actionLoading?.startsWith(c.id)}
                                className="p-2 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                title="Disqualify Candidate"
                              >
                                {actionLoading === `${c.id}-DISQUALIFIED` ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                              </button>
                            </div>
                          )}

                          {/* Undo Button */}
                          {undoStack.find(u => u.candidateId === c.id) && (
                            <button
                              onClick={() => handleUndo(c.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-amber-500/20 transition-all"
                            >
                              <Undo2 className="w-3 h-3" />
                              Undo
                            </button>
                          )}

                          {/* Reset Status for decided candidates */}
                          {c.status !== 'PENDING_VERIFICATION' && c.status !== 'ACKNOWLEDGED' && c.status !== 'FLAGGED' && canModifyStatus && !undoStack.find(u => u.candidateId === c.id) && (
                            <button
                              onClick={() => handleStatusUpdate(c.id, 'PENDING_VERIFICATION')}
                              className="text-[10px] font-bold text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest ml-2"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/20">
                          <Filter className="w-8 h-8" />
                        </div>
                        <p className="text-white/40 font-medium">No candidates found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Reject Confirmation Modal (Screening Phase) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isRejecting && setRejectTarget(null)} />
          <div className="relative w-full max-w-md bg-[#140B2D] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />
            <div className="relative space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 mb-4">
                  <UserX className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Reject {rejectTarget.user?.first_name} {rejectTarget.user?.surname}?</h3>
                <p className="text-white/50 text-sm mt-2">Choose what happens to this user after rejection.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all">
                  <input
                    type="radio"
                    name="rejectAction"
                    checked={rejectAction === 'retain'}
                    onChange={() => setRejectAction('retain')}
                    className="mt-1 accent-amber-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Retain as Voter</p>
                    <p className="text-xs text-white/40 mt-0.5">The user will remain in the organization with a Voter role.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-white/10 hover:border-red-500/30 transition-all">
                  <input
                    type="radio"
                    name="rejectAction"
                    checked={rejectAction === 'remove'}
                    onChange={() => setRejectAction('remove')}
                    className="mt-1 accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-red-400">Remove from Organization</p>
                    <p className="text-xs text-white/40 mt-0.5">The user will be completely removed from the tenant.</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  disabled={isRejecting}
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isRejecting}
                  onClick={handleReject}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRejecting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApplicationViewerModal
        isOpen={!!viewerCandidate}
        onClose={() => setViewerCandidate(null)}
        candidate={viewerCandidate}
        electionId={electionId || viewerCandidate?.electionID || ''}
        onStatusUpdate={handleStatusUpdate}
        onRejectTrigger={setRejectTarget}
        subscription={tenantSubscription}
        isScreeningEnabled={isScreeningEnabled}
      />
    </div>
  );
}
