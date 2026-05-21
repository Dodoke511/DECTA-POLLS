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
  ShieldAlert,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppealPage from '../appeal/page';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';

// ─── Glass Panel Component ───────────────────────────────────────────────────
function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[30px] border border-white/65 bg-white/45 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.09]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-5rem] h-48 w-48 rounded-full bg-[var(--tenant-secondary)]/20 blur-3xl" />
      {children}
    </section>
  );
}
import { evaluateCondition } from '@/lib/rules/evaluators';

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
    <GlassPanel className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/50 border border-white/60 flex items-center justify-center">
        <Lock className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-slate-600 font-bold max-w-xs">{message}</p>
    </GlassPanel>
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

  // Appeal tracking
  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const [appealConfig, setAppealConfig] = useState<any>(null);
  const [appealCount, setAppealCount] = useState(0);
  const [hasApprovedUpdateAppeal, setHasApprovedUpdateAppeal] = useState(false);
  const [isScreeningPersisted, setIsScreeningPersisted] = useState(false);

  // COC Form data
  const [showCOC, setShowCOC] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [responseValues, setResponseValues] = useState<FormResponseValue[]>([]);
  const [failedRules, setFailedRules] = useState<any[]>([]);
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

  // Appeals tab is temporarily locked when:
  // - No candidate record yet (DRAFT / not filed)
  // - Candidate is PENDING_VERIFICATION (awaiting initial review)
  // - Candidate has a pending appeal already under review
  const isAppealTabTemporarilyLocked =
    !candidate ||
    ['DRAFT', 'PENDING_VERIFICATION'].includes(candidate.status) ||
    hasPendingAppeal;

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

        const candidateRecord = { ...data, position };
        setCandidate(candidateRecord);

        // Check for a pending appeal so we can lock the tab appropriately
        const { data: appealData } = await supabase
          .from('appeals')
          .select('id, status')
          .eq('candidateID', data.id)
          .eq('electionID', election.id)
          .order('submittedAt', { ascending: false });

        if (Array.isArray(appealData)) {
          setAppealCount(appealData.length);
          const pending = appealData.find((a: any) => a.status === 'pending');
          setHasPendingAppeal(Boolean(pending));

          const approvedUpdate = appealData.find((a: any) => a.status === 'approved' && a.appealType === 'request_to_update_information');
          setHasApprovedUpdateAppeal(Boolean(approvedUpdate));
        }

        const screeningPhaseId = phases?.find((p: any) => p.phase_type === 'screening')?.id;
        if (screeningPhaseId) {
          try {
            const { data: approvalConfig } = await supabase
              .from('approvals')
              .select('persist_until_appeals_end')
              .eq('phaseID', screeningPhaseId)
              .maybeSingle();

            if (approvalConfig) {
              setIsScreeningPersisted(approvalConfig.persist_until_appeals_end || false);
            }
          } catch (e) {
            console.error(e);
          }
        }

        const appealPhaseId = phases?.find((p: any) => p.phase_type === 'appeal')?.id;
        if (appealPhaseId) {
          try {
            const configRes = await fetch(`/api/get_appeal_config?electionId=${election.id}&phaseId=${appealPhaseId}`);
            if (configRes.ok) {
              const configData = await configRes.json();
              setAppealConfig(configData.config);
            }
          } catch (e) {
            console.error(e);
          }
        }
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

      const [{ data: fields }, { data: resp }, { data: rulesData }] = await Promise.all([
        supabase.from('form field').select('id, label, fieldType, orderIndex').eq('formId', form.id).order('orderIndex', { ascending: true }),
        supabase.from('form response').select('id').eq('formId', form.id).eq('userID', userContext!.userId).maybeSingle(),
        supabase.from('phase rule').select('*').eq('electionID', election.id)
      ]);

      setFormFields(fields || []);

      if (resp) {
        const { data: values } = await supabase
          .from('form response value')
          .select('fieldID, value')
          .eq('responseID', resp.id);
        
        setResponseValues(values || []);

        // Evaluate screening rules for flagged fields
        if (rulesData && values) {
          const failed: any[] = [];
          rulesData.forEach(rule => {
            let logic = rule.conditionLogic;
            if (typeof logic === 'string') {
              try { logic = JSON.parse(logic); } catch (e) {}
            }

            if (logic && logic.fieldId) {
              const valObj = values.find((v: any) => v.fieldID === logic.fieldId);
              const actualValue = valObj ? valObj.value : null;

              const passed = evaluateCondition(logic.operator, actualValue, logic.value);

              if (!passed) {
                failed.push({ ...rule, logic });
              }
            }
          });
          setFailedRules(failed);
        }
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
        <GlassPanel className="p-8">
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
            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl backdrop-blur-md">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 font-black">Under Review</p>
                <p className="text-sm text-amber-700 font-medium mt-0.5">Your application is being reviewed by the election committee. You will be notified of the outcome.</p>
              </div>
            </div>
          )}
          {candidate?.status === 'APPROVED' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800 font-black">Candidacy Approved</p>
                <p className="text-sm text-emerald-700 font-medium mt-0.5">Your candidacy has been officially confirmed by the election committee.</p>
              </div>
            </div>
          )}
          {candidate?.status === 'REJECTED' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 font-black">Application Rejected</p>
                <p className="text-sm text-red-700 font-medium mt-0.5">Your candidacy has been rejected. You may submit an appeal if the appeal phase is open.</p>
              </div>
            </div>
          )}
        </GlassPanel>

        {/* View COC Form */}
        <GlassPanel className="overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--tenant-primary)]/10 flex items-center justify-center border border-[var(--tenant-primary)]/20">
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
              {failedRules.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6 mb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h3 className="text-red-700 font-bold">Screening Feedback</h3>
                  </div>
                  <ul className="space-y-2 mt-3">
                    {failedRules.map((rule, idx) => (
                      <li key={idx} className="text-sm text-red-600">
                        <span className="font-semibold">{rule.label || `Requirement on ${rule.logic?.fieldName || 'field'}`}:</span> {rule.message || rule.error_message || 'Criteria not met.'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formFields.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">No form data found.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {formFields.map(field => {
                    const val = responseValues.find(rv => rv.fieldID === field.id);
                    const isFile = field.fieldType === 'file_upload';
                    const isFailed = failedRules.some(r => r.logic?.fieldId === field.id);

                    return (
                      <div key={field.id} className={`grid grid-cols-3 gap-4 py-3 border-b ${isFailed ? 'border-red-100 bg-red-50/50 -mx-4 px-4 rounded-lg' : 'border-slate-50'} last:border-0`}>
                        <div className="col-span-1 pt-0.5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</p>
                          {isFailed && <span className="inline-block mt-1 text-red-500 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 rounded-full">FLAGGED</span>}
                        </div>
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
                            <p className={`text-sm font-semibold ${isFailed ? 'text-red-900' : 'text-slate-800'}`}>{val?.value || <span className={`${isFailed ? 'text-red-400' : 'text-slate-300'} italic`}>Not provided</span>}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* Go to Candidacy Form (if filing still open and not yet submitted) */}
        {isFilingActive && (!candidate || candidate.status === 'DRAFT') && (
          <button
            onClick={() => router.push(`/${tenant.slug}/${election.slug}/file/candidacy-form`)}
            className="w-full mt-4 flex items-center justify-between px-6 py-5 bg-[var(--tenant-primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-md group"
          >
            <span>Complete Your Application Form</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        {/* Edit COC Form (if candidate has approved request_to_update_information appeal) */}
        {hasApprovedUpdateAppeal && (
          <div className="mt-4">
            <button
              onClick={() => isScreeningPersisted ? router.push(`/${tenant.slug}/${election.slug}/file/candidacy-form?editMode=appeal`) : null}
              disabled={!isScreeningPersisted}
              title={!isScreeningPersisted ? "The committee is currently not accepting screening updates." : ""}
              className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl font-bold shadow-md transition-all group ${
                isScreeningPersisted 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
              }`}
            >
              <div className="flex flex-col text-left">
                <span>Edit Your COC Information</span>
                {!isScreeningPersisted && (
                  <span className="text-xs font-normal mt-0.5">Workflow Continuity is disabled. Screening updates are locked by the committee.</span>
                )}
              </div>
              {isScreeningPersisted && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        )}

        {/* Go to Appeal Form (if appeal is active and candidate is eligible) */}
        {(() => {
          if (!candidate) return null;
          if (hasPendingAppeal) return null;
          
          const s = candidate.status;
          if (s === 'PENDING_VERIFICATION' || s === 'DRAFT' || s === 'DISQUALIFIED') return null;
          
          const w = appealConfig?.whoCanAppeal;
          if (w === 'rejected_only' && s !== 'REJECTED') return null;
          if (w === 'flagged_only' && s !== 'FLAGGED') return null;
          if (w === 'rejected_and_flagged' && !['REJECTED', 'FLAGGED'].includes(s)) return null;
          if (w === 'approved_only' && s !== 'APPROVED') return null;
          
          const max = appealConfig?.maxAppeals || 1;
          if (appealCount >= max) return null;

          return (
            <button
              onClick={() => setActiveTab('appeals')}
              className="w-full mt-4 flex items-center justify-between px-6 py-5 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-md group"
            >
              <span>Submit an Appeal</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          );
        })()}
      </div>
    );
  }

  function renderAppeals() {
    if (!isAppealActive) {
      return <PhaseGate message="The appeal phase is not currently active. Appeals will be available once the committee opens the appeal window." />;
    }
    // Show a friendly gate instead of the form when the tab is temporarily locked
    if (isAppealTabTemporarilyLocked) {
      const message = hasPendingAppeal
        ? "Your appeal is currently being reviewed by the committee. Please wait for their decision before submitting another."
        : candidate?.status === 'PENDING_VERIFICATION'
        ? "Your candidacy application is still under review. The appeals section will be available once a decision has been made."
        : "You must complete your candidacy application before you can access the appeals section.";
      return (
        <GlassPanel className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-slate-600 font-bold max-w-xs">{message}</p>
        </GlassPanel>
      );
    }
    return <AppealPage isEmbedded={true} />;
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
    if (!isVotingActive) {
      return <PhaseGate message="Voting has not started yet. You'll be able to access the ballot once the voting phase opens." />;
    }
    return (
      <div className="space-y-6">
        <GlassPanel className="p-8">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-2">Voting Phase</p>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Official Ballot</h2>
          <p className="text-slate-500 text-sm">The voting phase is currently active.</p>
        </GlassPanel>
        <GlassPanel className="p-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[var(--tenant-primary)]/10 flex items-center justify-center border border-[var(--tenant-primary)]/20">
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
        </GlassPanel>
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
        <GlassPanel className="p-8">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--tenant-primary)] mb-2">Results</p>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Election Results</h2>
          <p className="text-slate-500 text-sm">Official election results are now available.</p>
        </GlassPanel>
        <button
          onClick={() => router.push(`/${tenant.slug}/${election.slug}/results`)}
          className="w-full flex items-center justify-between px-6 py-5 bg-white/50 border border-white/60 rounded-2xl font-bold text-slate-900 hover:border-[var(--tenant-primary)] hover:shadow-md transition-all group shadow-sm backdrop-blur-md"
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

  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-10 sm:px-6">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] h-96 w-96 rounded-full bg-[var(--tenant-secondary)]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {tabContent[activeTab]()}
        </div>
      </div>
    </div>
  );
}