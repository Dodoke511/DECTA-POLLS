"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, AlertCircle, Lock, Clock } from 'lucide-react';
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
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  // Locked if: pending appeal exists, or status is PENDING_VERIFICATION, DRAFT, or no status yet
  const isAppealLocked = hasPendingAppeal || candidateStatus === 'PENDING_VERIFICATION' || candidateStatus === 'DRAFT' || !candidateStatus;
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(true);

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
            const pendingAppeal = appealData.find((appeal: any) => appeal.status === 'pending');
            setHasPendingAppeal(Boolean(pendingAppeal));
            if (pendingAppeal) {
              setShowForm(false);
            }
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
      if (appealConfig?.whoCanAppeal === 'approved_only' && candidateStatus !== 'APPROVED') {
        throw new Error('Only approved candidates can appeal.');
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
          formResponseID: responseData.id,
          submittedAt: new Date().toISOString(),
        });

      if (appealError) throw appealError;

      setSuccessMessage('Your appeal has been submitted successfully. The committee will review it shortly.');
      setFormData({});

      setTimeout(() => {
        router.push(`/${tenant?.slug}/${election.slug}/candidate-dashboard`);
      }, 2000);
    } catch (err: any) {
      console.error('Appeal submission error:', err);
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
      <div className="mb-12 border-b border-slate-100 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Submit an Appeal</h1>
            <p className="text-slate-500 text-lg">
              If your application was rejected, you may submit a formal appeal to the election committee for review.
            </p>
          </div>
          {/* Only show toggle button when the form is actually usable */}
          {!isAppealLocked && (
            <button
              type="button"
              onClick={() => setShowForm(prev => !prev)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--tenant-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--tenant-primary)]/20 transition hover:bg-[var(--tenant-primary)]/90"
            >
              {showForm ? 'Hide Appeal Form' : 'Show Appeal Form'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-xl">
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
        {!isAppealLocked && showForm && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {formFields.map((field) => {
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