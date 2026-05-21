"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, AlertCircle, Lock, Clock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AppealPage() {
  const { userContext, phases, tenant, election } = useElectionPublic();
  const router = useRouter();
  const isAppealActive = isPhaseActive(phases, 'appeal');

  const [loading, setLoading] = useState(true);
  const [appealConfig, setAppealConfig] = useState<any>(null);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const [allAppeals, setAllAppeals] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  // Locked if: pending appeal exists, or status is PENDING_VERIFICATION, DRAFT, or no status yet
  const isAppealLocked = hasPendingAppeal || candidateStatus === 'PENDING_VERIFICATION' || candidateStatus === 'DRAFT' || !candidateStatus;
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAppealType, setSelectedAppealType] = useState<string>('');
  const [positions, setPositions] = useState<any[]>([]);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
            setAllAppeals(appealData);
            const pendingAppeal = appealData.find((appeal: any) => appeal.status === 'pending');
            setHasPendingAppeal(Boolean(pendingAppeal));
          }
        }

        const phaseId = phases?.find((p: any) => p.phase_type === 'appeal')?.id;
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
          const parsedFields = fields.map((field: any) => {
            if (typeof field.validationRules === 'string') {
              try {
                field.validationRules = JSON.parse(field.validationRules);
              } catch (e) {
                console.error('Failed to parse validationRules', e);
              }
            }
            return field;
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
  }, [userContext, election?.id, phases]);

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
          let finalValue = String(value);

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
    } catch (err: any) {
      // Use console.warn to prevent Next.js dev overlay from interrupting the UI for handled validation errors
      console.warn('Appeal submission validation:', err.message);
      setError(err.message || 'An error occurred while submitting your appeal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  if (!userContext?.isCandidate) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500">This page is for candidates only.</p>
        </div>
      </div>
    );
  }
  if (!isAppealActive) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-md">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Appeals Not Active</h2>
          <p className="text-slate-500">The appeal phase is not currently active. Appeals will be available once the committee opens the appeal window.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12 px-6 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
        <p className="text-slate-400 font-medium animate-pulse">Loading Appeal Form...</p>
      </div>
    );
  }

  if (!formConfig || formFields.length === 0) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Not Configured</h2>
          <p className="text-slate-500">The election organizers have not yet configured the appeal form for this election.</p>
        </div>
      </div>
    );
  }

  // ── Pending appeal: show read-only waiting state, no form ─────────────────
  if (hasPendingAppeal) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="mb-12 border-b border-slate-100 pb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Submit an Appeal</h1>
          <p className="text-slate-500 text-lg">
            If your application was rejected, you may submit a formal appeal to the election committee for review.
          </p>
        </div>
        <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-xl flex flex-col items-center text-center gap-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Appeals</h1>
        <p className="text-slate-500 text-lg">
          Track your appeal status or submit a new formal appeal to the election committee for review.
        </p>
      </div>

      {allAppeals.length > 0 && (
        <div className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-200 shadow-xl mb-8">
          <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Your Submitted Appeals</h3>
          <div className="space-y-4">
            {allAppeals.map(appeal => (
              <div key={appeal.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 shadow-sm">
                <div>
                  <p className="text-sm font-bold text-slate-800">Appeal Submitted</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(appeal.submittedAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    appeal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    appeal.status === 'approved' ? 'bg-green-100 text-green-700' :
                    appeal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {appeal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-xl">
        {/* Indicator who can appeal */}
        <div className="mb-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-medium flex items-start gap-3">
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
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
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
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
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
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 font-medium">
            {successMessage}
          </div>
        )}

        {/* Appeal form — only rendered when not locked */}
        {!isAppealLocked && (
          <form onSubmit={handleSubmit} className="space-y-8 mt-6">
            
            {appealConfig?.appealTypes && appealConfig.appealTypes.length > 0 && (
              <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
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
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${selectedAppealType === type ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${selectedAppealType === type ? 'border-blue-500' : 'border-slate-300'}`}>
                          {selectedAppealType === type && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className={`text-sm font-medium ${selectedAppealType === type ? 'text-blue-900' : 'text-slate-700'}`}>
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
                    <div className="mt-3 h-px bg-slate-200" />
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'long_text' && (
                    <textarea
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'number' && (
                    <input
                      type="number"
                      required={field.required}
                      min={field.validationRules?.min}
                      max={field.validationRules?.max}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'position_selector' && (
                    <select
                      required={field.required}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="" className="font-normal text-slate-500">{field.validationRules?.placeholder || 'Select a position'}</option>
                      {positions.map((pos: any, idx: number) => (
                        <option key={idx} value={pos.title}>{pos.title}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === 'email' && (
                    <input
                      type="email"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'phone' && (
                    <input
                      type="tel"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all [color-scheme:light]"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {field.fieldType === 'url' && (
                    <input
                      type="url"
                      required={field.required}
                      placeholder={field.validationRules?.placeholder || ''}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}

                  {['dropdown', 'radio', 'checkbox'].includes(field.fieldType) && (
                    <select
                      required={field.required}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                      style={{ color: '#0f172a' }}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="" className="font-normal text-slate-500">Select an option</option>
                      {(field.validationRules?.options || []).map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === 'file_upload' && (
                    <input
                      type="file"
                      required={field.required}
                      accept={field.validationRules?.allowedTypes ? `.${field.validationRules.allowedTypes.replace(/,/g, ',.')}` : undefined}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[var(--tenant-primary)] file:text-white hover:file:bg-opacity-90"
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

            <div className="pt-8 mt-8 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}

