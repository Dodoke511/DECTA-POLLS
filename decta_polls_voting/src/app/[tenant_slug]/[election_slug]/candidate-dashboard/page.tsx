"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import {
  isPhaseActive,
  isPhaseReachable,
} from '@/lib/public-election/phase-utils';
import { createClient } from '@supabase/supabase-js';
import {
  Loader2,
  FileText,
  Eye,
  Scale,
  Users,
  Vote,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppealPage from '../appeal/page';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'candidacy' | 'appeals' | 'candidates' | 'vote' | 'results';
const VALID_TABS: TabId[] = ['candidacy', 'appeals', 'candidates', 'vote', 'results'];

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'candidacy', label: 'Candidacy', icon: FileText },
  { id: 'appeals', label: 'Appeals', icon: Scale },
  { id: 'candidates', label: 'Candidates', icon: Users },
  { id: 'vote', label: 'Vote Now', icon: Vote },
  { id: 'results', label: 'Results', icon: BarChart3 },
];

interface CandidateRecord {
  id: string;
  status: string;
  filedDate: string;
  position?: string;
}

interface FormField {
  id: string;
  label: string;
  fieldType: string;
  orderIndex: number;
}

interface FormResponseValue {
  fieldID: string;
  value: string;
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
    PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'bg-amber-50 text-amber-600 border border-amber-100' },
    APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-600 border border-red-100' },
    DISQUALIFIED: { label: 'Disqualified', cls: 'bg-red-50 text-red-600 border border-red-100' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Phase Gate Banner ────────────────────────────────────────────────────────

function PhaseGate({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Lock className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-slate-500 font-medium max-w-xs">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  const { userContext, tenant, election, phases, siteConfig } = useElectionPublic();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>('candidacy');
  const [loading, setLoading] = useState(true);

  // Candidate record
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);

  // COC Form data
  const [showCOC, setShowCOC] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [responseValues, setResponseValues] = useState<FormResponseValue[]>([]);
  const [cocLoading, setCocLoading] = useState(false);

  // Other candidates
  const [otherCandidates, setOtherCandidates] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  // Phase flags
  const isFilingActive = isPhaseActive(phases, 'filing');
  const isAppealActive = isPhaseActive(phases, 'appeal');
  const isVotingActive = isPhaseActive(phases, 'voting');
  const isPublicationReachable = isPhaseReachable(phases, 'publication');
  const isResultsReachable = isPhaseReachable(phases, 'results');
  const candidateCanViewResults = siteConfig?.candidate_can_view_results !== false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const requestedTab = searchParams.get('tab') as TabId | null;
    setActiveTab(requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'candidacy');
  }, [searchParams]);

  // ── Guard & initial load ───────────────────────────────────────────────────

  useEffect(() => {
    if (!userContext?.userId) {
      setLoading(false);
      return;
    }
    if (!userContext.isCandidate) {
      setLoading(false);
      return;
    }

    async function loadCandidate() {
      const { data } = await supabase
        .from('candidate')
        .select('id, status, filedDate')
        .eq('userID', userContext!.userId)
        .eq('electionID', election.id)
        .maybeSingle();

      if (data) {
        // Try to get position from form response values
        let position: string | undefined;
        const { data: form } = await supabase
          .from('forms')
          .select('id')
          .eq('electionID', election.id)
          .eq('phaseName', 'candidate_application')
          .maybeSingle();

        if (form) {
          const { data: posField } = await supabase
            .from('form field')
            .select('id')
            .eq('formId', form.id)
            .eq('fieldType', 'position_selector')
            .maybeSingle();

          if (posField) {
            const { data: resp } = await supabase
              .from('form response')
              .select('id')
              .eq('formId', form.id)
              .eq('userID', userContext!.userId)
              .maybeSingle();

            if (resp) {
              const { data: val } = await supabase
                .from('form response value')
                .select('value')
                .eq('responseID', resp.id)
                .eq('fieldID', posField.id)
                .maybeSingle();
              position = val?.value;
            }
          }
        }

        setCandidate({ ...data, position });
      }
      setLoading(false);
    }

    loadCandidate();
  }, [userContext, election.id]);

  // ── Load COC form data ─────────────────────────────────────────────────────

  const handleViewCOC = async () => {
    if (showCOC) { setShowCOC(false); return; }
    setCocLoading(true);

    try {
      const { data: form } = await supabase
        .from('forms')
        .select('id')
        .eq('electionID', election.id)
        .eq('phaseName', 'candidate_application')
        .maybeSingle();

      if (!form) return;

      const [{ data: fields }, { data: resp }] = await Promise.all([
        supabase.from('form field').select('id, label, fieldType, orderIndex').eq('formId', form.id).order('orderIndex', { ascending: true }),
        supabase.from('form response').select('id').eq('formId', form.id).eq('userID', userContext!.userId).maybeSingle(),
      ]);

      setFormFields(fields || []);

      if (resp) {
        const { data: values } = await supabase
          .from('form response value')
          .select('fieldID, value')
          .eq('responseID', resp.id);
        setResponseValues(values || []);
      }

      setShowCOC(true);
    } finally {
      setCocLoading(false);
    }
  };

  // ── Load other candidates ──────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'candidates' || !isPublicationReachable) return;
    if (otherCandidates.length > 0) return; // already loaded

    setCandidatesLoading(true);
    async function loadCandidates() {
      const { data } = await supabase
        .from('candidate')
        .select('id, status, userID, tenant users(first_name, surname)')
        .eq('electionID', election.id)
        .eq('status', 'APPROVED');
      setOtherCandidates(data || []);
      setCandidatesLoading(false);
    }
    loadCandidates();
  }, [activeTab, isPublicationReachable]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Guards
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
        <p className="text-slate-400 font-medium animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  if (!userContext?.isCandidate) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div className="max-w-md text-center p-10 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500">This dashboard is for candidates only.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Content
  // ─────────────────────────────────────────────────────────────────────────────

  function renderCandidacy() {
    return (
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)]">Your Candidacy</p>
              <h2 className="text-2xl font-black text-slate-900">{userContext!.name}</h2>
              {candidate?.position && (
                <p className="text-slate-500 font-semibold">Running for: <span className="text-slate-800">{candidate.position}</span></p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3">
              {candidate ? <StatusBadge status={candidate.status} /> : <StatusBadge status="DRAFT" />}
              {candidate?.filedDate && (
                <p className="text-xs text-slate-400 font-medium">
                  Filed {new Date(candidate.filedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Status Message */}
          {candidate?.status === 'PENDING_VERIFICATION' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700">Under Review</p>
                <p className="text-sm text-amber-600 mt-0.5">Your application is being reviewed by the election committee. You will be notified of the outcome.</p>
              </div>
            </div>
          )}
          {candidate?.status === 'APPROVED' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-700">Candidacy Approved</p>
                <p className="text-sm text-emerald-600 mt-0.5">Your candidacy has been officially confirmed by the election committee.</p>
              </div>
            </div>
          )}
          {candidate?.status === 'REJECTED' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Application Rejected</p>
                <p className="text-sm text-red-600 mt-0.5">Your candidacy has been rejected. You may submit an appeal if the appeal phase is open.</p>
              </div>
            </div>
          )}
        </div>

        {/* View COC Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--tenant-primary-light,#ede9ff)] flex items-center justify-center">
                <Eye className="w-5 h-5 text-[var(--tenant-primary)]" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Certificate of Candidacy (COC)</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">View your submitted application responses</p>
              </div>
            </div>
            <button
              onClick={handleViewCOC}
              disabled={cocLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--tenant-primary)] text-white text-sm font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-60"
            >
              {cocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {showCOC ? 'Hide COC' : 'View COC Form'}
            </button>
          </div>

          {showCOC && (
            <div className="border-t border-slate-100 px-6 pb-6">
              {formFields.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">No form data found.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {formFields.map(field => {
                    const val = responseValues.find(rv => rv.fieldID === field.id);
                    const isFile = field.fieldType === 'file_upload';
                    return (
                      <div key={field.id} className="grid grid-cols-3 gap-4 py-3 border-b border-slate-50 last:border-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider col-span-1 pt-0.5">{field.label}</p>
                        <div className="col-span-2">
                          {isFile && val?.value ? (
                            <a
                              href={val.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[var(--tenant-primary)] font-semibold text-sm hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Uploaded File
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-slate-800">{val?.value || <span className="text-slate-300 italic">Not provided</span>}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Go to Candidacy Form (if filing still open and not yet submitted) */}
        {isFilingActive && (!candidate || candidate.status === 'DRAFT') && (
          <button
            onClick={() => router.push(`/${tenant.slug}/${election.slug}/file/candidacy-form`)}
            className="w-full flex items-center justify-between px-6 py-5 bg-[var(--tenant-primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-md group"
          >
            <span>Complete Your Application Form</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    );
  }

  function renderAppeals() {
    if (!isAppealActive) {
      return <PhaseGate message="The appeal phase is not currently active. Appeals will be available once the committee opens the appeal window." />;
    }
    return <AppealPage />;
  }

  function renderCandidates() {
    if (!isPublicationReachable) {
      return <PhaseGate message="Candidate profiles will be visible once the publication phase begins." />;
    }
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-1">Browse Candidates</p>
          <h2 className="text-xl font-black text-slate-900">Meet the Candidates</h2>
        </div>
        {candidatesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[var(--tenant-primary)]" /></div>
        ) : otherCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No approved candidates yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherCandidates.map((c: any) => {
              const user = c['tenant users'];
              const name = user ? `${user.first_name || ''} ${user.surname || ''}`.trim() : 'Candidate';
              const isMe = c.userID === userContext!.userId;
              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col items-center text-center gap-3 transition-all hover:shadow-md ${isMe ? 'border-[var(--tenant-primary)] ring-1 ring-[var(--tenant-primary)]' : 'border-slate-200'}`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{name}</p>
                    {isMe && <span className="text-xs font-black text-[var(--tenant-primary)] uppercase tracking-wider">You</span>}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderVote() {
    // Candidates cannot vote — but the diagram shows "Vote Now → Ballot page"
    // We show the ballot page link for awareness but note they can't cast a vote
    if (!isVotingActive) {
      return <PhaseGate message="Voting has not started yet. You'll be able to access the ballot once the voting phase opens." />;
    }
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-2">Voting Phase</p>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Official Ballot</h2>
          <p className="text-slate-500 text-sm">The voting phase is currently active.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[var(--tenant-primary-light,#ede9ff)] flex items-center justify-center">
            <Vote className="w-9 h-9 text-[var(--tenant-primary)]" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 mb-2">Voting is Now Open</p>
            <p className="text-slate-500 text-sm max-w-xs">As a candidate, you may view the official ballot. Contact the election committee with any concerns.</p>
          </div>
          <button
            onClick={() => router.push(`/${tenant.slug}/${election.slug}/vote`)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--tenant-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md"
          >
            <Vote className="w-5 h-5" />
            View Ballot Page
          </button>
        </div>
      </div>
    );
  }

  function renderResults() {
    if (!isResultsReachable) {
      return <PhaseGate message="Election results will be published once the results phase is active." />;
    }
    if (!candidateCanViewResults) {
      return <PhaseGate message="Access to election results has been restricted by the administrator." />;
    }
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-2">Results</p>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Election Results</h2>
          <p className="text-slate-500 text-sm">Official election results are now available.</p>
        </div>
        <button
          onClick={() => router.push(`/${tenant.slug}/${election.slug}/results`)}
          className="w-full flex items-center justify-between px-6 py-5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 hover:border-[var(--tenant-primary)] hover:shadow-md transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[var(--tenant-primary)]" />
            <span>View Full Results Page</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  const tabContent: Record<TabId, () => React.ReactNode> = {
    candidacy: renderCandidacy,
    appeals: renderAppeals,
    candidates: renderCandidates,
    vote: renderVote,
    results: renderResults,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Page Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-1">Candidate Portal</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {userContext.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {siteConfig?.public_title || election.title}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const locked =
              (tab.id === 'appeals' && !isAppealActive) ||
              (tab.id === 'candidates' && !isPublicationReachable) ||
              (tab.id === 'vote' && !isVotingActive) ||
              (tab.id === 'results' && !isResultsReachable);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-[var(--tenant-primary)] text-white shadow-md'
                    : locked
                    ? 'text-slate-300 hover:text-slate-400'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                {locked && !isActive && <Lock className="w-3 h-3 shrink-0 opacity-60" />}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {tabContent[activeTab]()}
        </div>
      </div>
    </div>
  );
}
