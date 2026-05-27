"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, AlertCircle, Lock, Clock, Info, CheckCircle2, XCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
      {children}
    </section>
  );
}

type AppealConfig = {
  appealTypes?: string[];
  maxAppeals?: number;
  whoCanAppeal?: string;
};

type ValidationRules = {
  allowedTypes?: string;
  helpText?: string;
  max?: number | string;
  min?: number | string;
  options?: string[];
  placeholder?: string;
};

type FormConfig = {
  id: string;
};

type FormField = {
  fieldType: string;
  id: string;
  label: string;
  required?: boolean;
  validationRules?: ValidationRules;
};

type RawFormField = Omit<FormField, 'validationRules'> & {
  validationRules?: string | ValidationRules;
};

type AppealRecord = {
  id: string;
  status: string;
  submittedAt: string;
  decisionReason?: string;
  decisionDate?: string;
};

type PositionRecord = {
  title: string;
};

type PublicPhase = {
  id?: string;
  phase_type?: string;
};

export default function AppealPage() {
  const { userContext, phases, tenant, election, siteConfig } = useElectionPublic();
  const router = useRouter();
  const isAppealActive = isPhaseActive(phases, 'appeal');
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const [loading, setLoading] = useState(true);
  const [appealConfig, setAppealConfig] = useState<AppealConfig | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const [allAppeals, setAllAppeals] = useState<AppealRecord[]>([]);
  const [formData, setFormData] = useState<Record<string, string | boolean | File | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  // Locked if: pending appeal exists, or status is PENDING_VERIFICATION, DRAFT, or no status yet
  const isAppealLocked = hasPendingAppeal || candidateStatus === 'PENDING_VERIFICATION' || candidateStatus === 'DRAFT' || !candidateStatus;
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAppealType, setSelectedAppealType] = useState<string>('');
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [selectedDecisionAppeal, setSelectedDecisionAppeal] = useState<AppealRecord | null>(null);

  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  useEffect(() => {
    async function fetchAppealForm() {
      if (!userContext?.userId || !election?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: candidateData } = await supabase
          .from('candidate')
          .select('id, status')
          .eq('userID', userContext.userId)
          .eq('electionID', election.id)
          .maybeSingle();

        if (candidateData) {
          setCandidateStatus(candidateData.status);

          const { data: appealData, error: appealFetchError } = await supabase
            .from('appeals')
            .select('id, status, submittedAt')
            .eq('candidateID', candidateData.id)
            .eq('electionID', election.id)
            .order('submittedAt', { ascending: false });

          if (!appealFetchError && Array.isArray(appealData)) {
            // Fetch decision details for each appeal
            const appealsWithDecisions = await Promise.all(
              appealData.map(async (appeal) => {
                let decisionReason = undefined;
                let decisionDate = undefined;

                if (appeal.status !== 'pending') {
                  const { data: decisions, error: decisionError } = await supabase
                    .from('appeal decisions')
                    .select('reason, created_at')
                    .eq('appealID', appeal.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (!decisionError && decisions) {
                    decisionReason = decisions.reason;
                    decisionDate = decisions.created_at;
                  }
                }

                return {
                  ...appeal,
                  decisionReason,
                  decisionDate,
                };
              })
            );

            setAllAppeals(appealsWithDecisions);
            const pendingAppeal = appealsWithDecisions.find((appeal: AppealRecord) => appeal.status === 'pending');
            setHasPendingAppeal(Boolean(pendingAppeal));
          }
        }

        const phaseId = phases?.find((p: PublicPhase) => p.phase_type === 'appeal')?.id;
        if (phaseId) {
          const configRes = await fetch(`/api/get_appeal_config?electionId=${election.id}&phaseId=${phaseId}`);
          const configData = await configRes.json();
          setAppealConfig(configData.config);
        }

        const formRes = await fetch(`/api/get_form?electionId=${election.id}&toolName=appeal_submission`);
        const formData = await formRes.json();

        if (formData?.form) {
          setFormConfig(formData.form);

          const fields = Array.isArray(formData.fields) ? formData.fields : [];
          const parsedFields = fields.map((field: RawFormField): FormField => {
            let validationRules: ValidationRules | undefined;
            if (typeof field.validationRules === 'string') {
              try {
                validationRules = JSON.parse(field.validationRules);
              } catch (e) {
                console.error('Failed to parse validationRules', e);
                validationRules = undefined;
              }
            } else {
              validationRules = field.validationRules;
            }
            return { ...field, validationRules };
          });
          setFormFields(parsedFields);
        }

        const { data: positionsData } = await supabase
          .from('positions')
          .select('title')
          .eq('electionID', election.id)
          .order('order_index', { ascending: true });

        if (positionsData) {
          setPositions(positionsData);
        }
      } catch (err) {
        console.error('Error fetching appeal form', err);
        setError('Failed to load appeal form');
      } finally {
        setLoading(false);
      }
    }

    fetchAppealForm();
  }, [userContext, election?.id, phases, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (!formConfig || !election?.id || !userContext?.userId) {
        throw new Error('Form configuration is missing.');
      }

      if (hasPendingAppeal) {
        throw new Error('An appeal is already under review. Please wait for the committee decision before submitting another appeal.');
      }
      if (!candidateStatus || candidateStatus === 'DRAFT') {
        throw new Error('You must submit your candidacy application before submitting an appeal.');
      }
      if (candidateStatus === 'PENDING_VERIFICATION') {
        throw new Error('Your application is still under review. Appeals are temporarily locked until a decision is made.');
      }
      if (appealConfig?.whoCanAppeal === 'rejected_only' && candidateStatus !== 'REJECTED') {
        throw new Error('Only rejected candidates can appeal.');
      }
      if (appealConfig?.whoCanAppeal === 'flagged_only' && candidateStatus !== 'FLAGGED') {
        throw new Error('Only flagged candidates can appeal.');
      }
      if (appealConfig?.whoCanAppeal === 'approved_only' && candidateStatus !== 'APPROVED') {
        throw new Error('Only approved candidates can appeal.');
      }
      if (appealConfig?.whoCanAppeal === 'rejected_and_flagged' && !['REJECTED', 'FLAGGED'].includes(candidateStatus)) {
        throw new Error('Only rejected or flagged candidates can appeal.');
      }

      const enabledAppealTypes = appealConfig?.appealTypes || [];
      if (enabledAppealTypes.length > 0 && !selectedAppealType) {
        throw new Error('Please select an appeal type before submitting.');
      }

      // Get candidate record early to check maxAppeals
      const { data: candidateRecord } = await supabase
        .from('candidate')
        .select('id')
        .eq('userID', userContext.userId)
        .eq('electionID', election.id)
        .maybeSingle();

      if (!candidateRecord?.id) {
        throw new Error('Candidate record not found.');
      }

      // Check if candidate has exceeded max appeals
      const maxAppeals = appealConfig?.maxAppeals || 1;
      const { data: allAppeals } = await supabase
        .from('appeals')
        .select('id')
        .eq('candidateID', candidateRecord.id)
        .eq('electionID', election.id);

      const appealCount = allAppeals?.length || 0;
      if (appealCount >= maxAppeals) {
        throw new Error(maxAppeals === 1
          ? 'You have already submitted an appeal for this election. Only one appeal is allowed per candidate.'
          : `You have reached the maximum number of appeals (${maxAppeals}) for this election.`);
      }

      const { data: responseData, error: responseError } = await supabase
        .from('form response')
        .insert({
          formId: formConfig.id,
          userID: userContext.userId,
          submittedAt: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (responseError) throw responseError;

      const responseValues = await Promise.all(
        Object.entries(formData).map(async ([fieldId, value]) => {
          let finalValue = String(value ?? '');

          if (value instanceof File) {
            const fileExt = value.name.split('.').pop();
            const fileName = `${fieldId}_${Date.now()}.${fileExt}`;
            const filePath = `${tenant?.slug}/${election.slug}/appeals/${userContext.userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('candidate-uploads')
              .upload(filePath, value, { upsert: true });

            if (uploadError) {
              throw new Error(`Failed to upload ${value.name}: ${uploadError.message}`);
            }

            const { data: publicUrlData } = supabase.storage
              .from('candidate-uploads')
              .getPublicUrl(filePath);

            finalValue = publicUrlData.publicUrl;
          }

          return {
            responseID: responseData.id,
            fieldID: fieldId,
            value: finalValue,
          };
        })
      );

      if (responseValues.length > 0) {
        const { error: valuesError } = await supabase
          .from('form response value')
          .insert(responseValues);

        if (valuesError) throw valuesError;
      }

      const { error: appealError } = await supabase
        .from('appeals')
        .insert({
          candidateID: candidateRecord.id,
          electionID: election.id,
          tenantID: tenant?.id,
          status: 'pending',
          appealType: selectedAppealType || null,
          formResponseID: responseData.id,
          submittedAt: new Date().toISOString(),
        });

      if (appealError) throw appealError;

      // Update candidate status back to PENDING_VERIFICATION
      const { error: candidateUpdateError } = await supabase
        .from('candidate')
        .update({ status: 'PENDING_VERIFICATION' })
        .eq('id', candidateRecord.id);

      if (candidateUpdateError) throw candidateUpdateError;

      setSuccessMessage('Your appeal has been submitted successfully. The committee will review it shortly.');
      setFormData({});

      setTimeout(() => {
        router.push(`/${tenant?.slug}/${election.slug}/candidate-dashboard`);
      }, 2000);
    } catch (err: unknown) {
      // Use console.warn to prevent Next.js dev overlay from interrupting the UI for handled validation errors
      const message = err instanceof Error ? err.message : 'An error occurred while submitting your appeal.';
      console.warn('Appeal submission validation:', message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (fieldId: string, value: string | boolean | File | undefined) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const getFieldValue = (fieldId: string) => {
    const value = formData[fieldId];
    return typeof value === 'string' ? value : '';
  };

  let content: React.ReactNode = null;

  if (loading) {
    content = (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
        <p className="text-slate-400 font-semibold animate-pulse">Loading Appeal Form...</p>
      </div>
    );
  } else if (!userContext?.isCandidate) {
    content = (
      <div className="flex justify-center">
        <GlassPanel className="p-8 md:p-12 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 font-semibold">This page is for candidates only.</p>
        </GlassPanel>
      </div>
    );
  } else if (!isAppealActive) {
    content = (
      <div className="flex justify-center">
        <GlassPanel className="p-8 md:p-12 text-center max-w-md w-full">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Appeals Not Active</h2>
          <p className="text-slate-500 font-semibold">The appeal phase is not currently active. Appeals will be available once the committee opens the appeal window.</p>
        </GlassPanel>
      </div>
    );
  } else if (!formConfig || formFields.length === 0) {
    content = (
      <div className="flex justify-center">
        <GlassPanel className="p-8 md:p-12 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Form Not Configured</h2>
          <p className="text-slate-500 font-semibold">The election organizers have not yet configured the appeal form for this election.</p>
        </GlassPanel>
      </div>
    );
  } else if (hasPendingAppeal) {
    content = (
      <GlassPanel className="p-8 md:p-12 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Clock className="w-9 h-9 text-amber-500" />
        </div>
        <div>
          <p className="text-xl font-black text-slate-900 mb-2">Your Appeal is Being Reviewed</p>
          <p className="text-slate-500 text-sm font-semibold max-w-sm">
            Your appeal has been submitted and is currently being reviewed by the election committee. Please wait for their decision — you will be notified of the outcome.
          </p>
        </div>
        <div className="w-full max-w-sm p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <p className="text-amber-700 text-sm font-bold">
            You cannot submit another appeal while one is already under review.
          </p>
        </div>
      </GlassPanel>
    );
  }
  void content;

  if (!isAppealActive) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-6 py-12 text-center">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="relative z-10 flex min-h-[calc(100vh-176px)] items-center justify-center">
          <GlassPanel className="max-w-md p-8">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Appeals Not Active</h2>
          <p className="text-slate-500">The appeal phase is not currently active. Appeals will be available once the committee opens the appeal window.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-6 py-12">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="relative z-10 flex min-h-[calc(100vh-176px)] flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
          <p className="text-slate-600 font-bold animate-pulse">Loading Appeal Form...</p>
        </div>
      </div>
    );
  }

  if (!formConfig || formFields.length === 0) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-6 py-12">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="relative z-10 flex min-h-[calc(100vh-176px)] items-center justify-center">
          <GlassPanel className="max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Not Configured</h2>
          <p className="text-slate-500">The election organizers have not yet configured the appeal form for this election.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  // ── Pending appeal: show read-only waiting state, but keep appeals history visible ─────────────────
  if (hasPendingAppeal) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-10 sm:px-6 lg:py-14">
        <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-8 rounded-[28px] border border-white/55 bg-white/35 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Submit an Appeal</h1>
            <p className="text-slate-500 text-lg">
              If your application was rejected, you may submit a formal appeal to the election committee for review.
            </p>
          </div>

          {/* Appeals History - Now visible even with pending appeal */}
          {allAppeals.length > 0 && (
            <GlassPanel className="mb-8 p-6 md:p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Your Submitted Appeals</h3>
              <div className="space-y-4">
                {allAppeals.map(appeal => (
                  <div key={appeal.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/65 bg-white/45 shadow-sm backdrop-blur-xl hover:shadow-md hover:bg-white/60 transition-all cursor-pointer">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Appeal Submitted</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(appeal.submittedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider w-fit ${appeal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          appeal.status === 'approved' ? 'bg-green-100 text-green-700' :
                            appeal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-slate-200 text-slate-700'
                        }`}>
                        {appeal.status}
                      </span>
                      {(appeal.status === 'approved' || appeal.status === 'rejected') && appeal.decisionReason && (
                        <button
                          onClick={() => setSelectedDecisionAppeal(appeal)}
                          className="text-sm font-bold text-[var(--tenant-primary)] hover:opacity-70 transition-opacity opacity-0 sm:opacity-0 group-hover:opacity-100 underline whitespace-nowrap"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          <GlassPanel className="p-8 md:p-12 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="w-9 h-9 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 mb-2">Your Appeal is Being Reviewed</p>
              <p className="text-slate-500 text-sm max-w-sm">
                Your appeal has been submitted and is currently being reviewed by the election committee. Please wait for their decision — you will be notified of the outcome.
              </p>
            </div>
            <div className="w-full max-w-sm p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-amber-700 text-sm font-semibold">
                You cannot submit another appeal while one is already under review.
              </p>
            </div>
          </GlassPanel>

          {/* Decision Modal */}
          {selectedDecisionAppeal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
              <div className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
                <button
                  onClick={() => setSelectedDecisionAppeal(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: selectedDecisionAppeal.status === 'approved' ? '#d1fae5' : '#fee2e2'
                    }}
                  >
                    {selectedDecisionAppeal.status === 'approved' ? (
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    ) : (
                      <XCircle className="w-7 h-7 text-red-600" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-900 capitalize">
                      Appeal {selectedDecisionAppeal.status}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedDecisionAppeal.decisionDate
                        ? `Decision made on ${new Date(selectedDecisionAppeal.decisionDate).toLocaleString()}`
                        : 'Decision date not available'}
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Committee Response
                    </p>
                    <p className="text-slate-800 font-medium leading-relaxed text-sm">
                      {selectedDecisionAppeal.decisionReason || 'No reason was provided by the committee.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedDecisionAppeal(null)}
                    className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl transition-all mt-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-10 sm:px-6 lg:py-14">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 rounded-[28px] border border-white/55 bg-white/35 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-8">
          <h1 className="text-3xl font-black text-slate-950 mb-2 tracking-tight sm:text-4xl">Appeals</h1>
          <p className="max-w-3xl text-base font-medium text-slate-600 sm:text-lg">
            Track your appeal status or submit a new formal appeal to the election committee for review.
          </p>
        </div>

      {allAppeals.length > 0 && (
        <GlassPanel className="mb-8 p-6 md:p-8">
          <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Your Submitted Appeals</h3>
          <div className="space-y-4">
            {allAppeals.map(appeal => (
              <div key={appeal.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/65 bg-white/45 shadow-sm backdrop-blur-xl hover:bg-white/60 hover:shadow-md transition-all cursor-pointer">                <div>
                  <p className="text-sm font-bold text-slate-800">Appeal Submitted</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(appeal.submittedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider w-fit ${appeal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      appeal.status === 'approved' ? 'bg-green-100 text-green-700' :
                        appeal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-slate-200 text-slate-700'
                    }`}>
                    {appeal.status}
                  </span>
                  {(appeal.status === 'approved' || appeal.status === 'rejected') && (
                    <button
                      onClick={() => setSelectedDecisionAppeal(appeal)}
                      className="text-sm font-bold text-[var(--tenant-primary)] hover:opacity-70 transition-opacity underline"
                    >
                      View Response
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="p-5 sm:p-8 md:p-10">
        {/* Indicator who can appeal */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[var(--tenant-secondary)]/35 bg-white/45 p-5 text-sm font-bold text-[var(--tenant-primary)] shadow-sm backdrop-blur-xl">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            {appealConfig?.whoCanAppeal === 'rejected_only' && "Only rejected candidates are eligible to submit an appeal."}
            {appealConfig?.whoCanAppeal === 'flagged_only' && "Only flagged candidates are eligible to submit an appeal."}
            {appealConfig?.whoCanAppeal === 'rejected_and_flagged' && "Only rejected or flagged candidates are eligible to submit an appeal."}
            {appealConfig?.whoCanAppeal === 'approved_only' && "Only approved candidates are eligible to submit an appeal."}
            {appealConfig?.whoCanAppeal === 'all' && "All candidates are eligible to submit an appeal."}
            {!appealConfig?.whoCanAppeal && "Appeal eligibility is currently based on tenant configuration."}
          </p>
        </div>

        {/* Locked: application still under initial review */}
        {candidateStatus === 'PENDING_VERIFICATION' && (
          <div className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center backdrop-blur-xl">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 mb-2">Waiting for Application Review</p>
              <p className="text-slate-500 text-sm max-w-xs">
                Your candidacy application is currently under review by the committee. The appeal form will become available once a decision has been made.
              </p>
            </div>
          </div>
        )}

        {/* Locked: no application submitted yet */}
        {isAppealLocked && candidateStatus !== 'PENDING_VERIFICATION' && (
          <div className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-16 h-16 rounded-2xl bg-white/45 border border-white/60 flex items-center justify-center backdrop-blur-xl">
              <Lock className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 mb-2">Appeal Unavailable</p>
              <p className="text-slate-500 text-sm max-w-xs">
                You need to complete and submit your candidacy application before you can file an appeal.
              </p>
            </div>
          </div>
        )}

        {/* Error / success banners */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 font-bold backdrop-blur-xl">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 font-bold backdrop-blur-xl">
            {successMessage}
          </div>
        )}

        {/* Appeal form — only rendered when not locked */}
        {!isAppealLocked && (
          <form onSubmit={handleSubmit} className="space-y-8 mt-6">

            {appealConfig?.appealTypes && appealConfig.appealTypes.length > 0 && (
              <div className="mb-8 p-5 sm:p-6 bg-white/35 border border-white/65 rounded-2xl shadow-sm backdrop-blur-xl">
                <h3 className="text-[15px] font-semibold text-slate-900 mb-4">Select Appeal Type <span className="text-red-500">*</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {appealConfig.appealTypes.map((type: string) => {
                    const typeLabels: Record<string, string> = {
                      'voluntary_withdrawal': 'Voluntary Withdrawal',
                      'request_to_update_information': 'Request to Update Information',
                      'opposing_candidate': 'Opposing a Candidate',
                      'others': 'Others'
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedAppealType(type)}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 ${selectedAppealType === type ? 'bg-[var(--tenant-primary)]/10 border-[var(--tenant-primary)] ring-1 ring-[var(--tenant-primary)]' : 'bg-white/45 border-white/65 hover:border-[var(--tenant-secondary)]/70 hover:bg-white/65'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${selectedAppealType === type ? 'border-[var(--tenant-primary)]' : 'border-slate-300'}`}>
                          {selectedAppealType === type && <div className="w-2 h-2 rounded-full bg-[var(--tenant-primary)]" />}
                        </div>
                        <span className={`text-sm font-bold ${selectedAppealType === type ? 'text-[var(--tenant-primary)]' : 'text-slate-700'}`}>
                          {typeLabels[type] || type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formFields.map((field) => {
              if (field.fieldType === 'section_header') {
                return (
                  <div key={field.id} className="pt-2">
                    <h3 className="text-[15px] font-semibold text-slate-900">{field.label}</h3>
                    {field.validationRules?.helpText && (
                      <p className="text-sm text-slate-500 mt-1">{field.validationRules.helpText}</p>
                    )}
                    <div className="mt-3 h-px bg-white/65" />
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.fieldType === 'short_text' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'long_text' && (
                    <textarea
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      rows={4}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'number' && (
                    <input
                      type="number"
                      step="any"
                      required={field.required}
                      min={field.validationRules?.min}
                      max={field.validationRules?.max}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'position_selector' && (
                    <select
                      required={field.required}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="" className="font-normal text-slate-500">{field.validationRules?.placeholder || 'Select a position'}</option>
                      {positions.map((pos, idx) => (
                        <option key={idx} value={pos.title}>{pos.title}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === 'email' && (
                    <input
                      type="email"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'phone' && (
                    <input
                      type="tel"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all [color-scheme:light]"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'url' && (
                    <input
                      type="url"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {['dropdown', 'radio'].includes(field.fieldType) && (
                    <select
                      required={field.required}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={getFieldValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="" className="font-normal text-slate-500">Select an option</option>
                      {(field.validationRules?.options || []).map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === 'checkbox' && (
                    <div className="flex items-start gap-3 pt-1">
                      <input
                        type="checkbox"
                        id={field.id}
                        required={field.required}
                        checked={formData[field.id] === true || formData[field.id] === 'true'}
                        onChange={(e) => handleInputChange(field.id, e.target.checked)}
                        className="w-5 h-5 rounded border border-white/70 bg-white/40 text-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none cursor-pointer transition-all shadow-sm accent-[var(--tenant-primary)] mt-0.5"
                      />
                      <label htmlFor={field.id} className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                        {field.validationRules?.placeholder || 'I agree to the terms and conditions'}
                      </label>
                    </div>
                  )}

                  {field.fieldType === 'file_upload' && (
                    <input
                      type="file"
                      required={field.required}
                      accept={field.validationRules?.allowedTypes ? `.${field.validationRules.allowedTypes.replace(/,/g, ',.')}` : undefined}
                      className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl file:mr-4 file:rounded-full file:border-0 file:bg-[var(--tenant-primary)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-opacity-90"
                      style={{ color: '#0f172a' }}
                      onChange={(e) => handleInputChange(field.id, e.target.files?.[0])}
                    />
                  )}

                  {field.validationRules?.helpText && (
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {field.validationRules.helpText}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="pt-8 mt-8 border-t border-white/65 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_18px_45px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.22)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Appeal...
                  </>
                ) : (
                  <>
                    Submit Appeal
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </GlassPanel>

      {/* Decision Response Modal */}
      {selectedDecisionAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <GlassPanel className="max-w-md w-full p-8 relative">
            <button
              onClick={() => setSelectedDecisionAppeal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{
                backgroundColor: selectedDecisionAppeal.status === 'approved' ? '#d1fae5' : '#fee2e2'
              }}>
                {selectedDecisionAppeal.status === 'approved' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 capitalize">
                Appeal {selectedDecisionAppeal.status}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Decision made on {selectedDecisionAppeal.decisionDate 
                  ? new Date(selectedDecisionAppeal.decisionDate).toLocaleString() 
                  : 'Date not available'}              </p>
              <div className="bg-white/35 border border-white/65 rounded-2xl p-5 text-left mb-6">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Committee Response</p>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedDecisionAppeal.decisionReason || 'No reason provided.'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDecisionAppeal(null)}
                className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
      </div>
    </div>
  );
}

