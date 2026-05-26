"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPublicElectionBackgroundImage, PublicElectionBackgroundLayer } from '@/components/public-election/PublicElectionBackground';

export default function CandidacyFormPage() {
  const { userContext, tenant, election, siteConfig } = useElectionPublic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get('editMode');
  const backgroundImage = getPublicElectionBackgroundImage(siteConfig, election);

  const [loading, setLoading] = useState(true);
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [phaseRules, setPhaseRules] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [politicalParty, setPoliticalParty] = useState('');
  const [existingParties, setExistingParties] = useState<string[]>(['INDEPENDENT']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchFormAndFields() {
      if (!userContext?.userId || !election?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Candidate
        const { data: candidateData } = await supabase
          .from('candidate')
          .select('id, status, political_party')
          .eq('userID', userContext.userId)
          .eq('electionID', election.id)
          .maybeSingle();

        if (candidateData) {
          setCandidateStatus(candidateData.status);
          if (candidateData.political_party) {
            setPoliticalParty(candidateData.political_party);
          }
        }

        // 2. Fetch Form
        const { data: formsData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('electionID', election.id)
          .eq('phaseName', 'candidate_application')
          .maybeSingle();

        if (formsData) {
          setFormConfig(formsData);

          // 3. Fetch Form Fields
          const { data: fieldsData } = await supabase
            .from('form field')
            .select('*')
            .eq('formId', formsData.id)
            .order('orderIndex', { ascending: true });

          if (fieldsData) {
            const parsedFields = fieldsData.map(field => {
              if (typeof field.validationRules === 'string') {
                try {
                  field.validationRules = JSON.parse(field.validationRules);
                } catch (e) {
                  console.error("Failed to parse validationRules", e);
                }
              }
              return field;
            });
            setFormFields(parsedFields);
          }
        }

        // 4. Fetch Phase Rules (if applicable to highlight requirements)
        const { data: rulesData } = await supabase
          .from('phase rule')
          .select('*')
          .eq('electionID', election.id);

        if (rulesData) {
          setPhaseRules(rulesData);
        }

        // 5. Fetch Positions (for position_selector)
        const { data: positionsData } = await supabase
          .from('positions')
          .select('id, title')
          .eq('electionID', election.id)
          .order('order_index', { ascending: true });

        if (positionsData) {
          setPositions(positionsData);
        }

        // 5b. Fetch Existing Parties
        const { data: partiesData } = await supabase
          .from('candidate')
          .select('political_party')
          .eq('electionID', election.id)
          .neq('political_party', 'INDEPENDENT')
          .not('political_party', 'is', null);

        if (partiesData) {
          const uniqueParties = ['INDEPENDENT', ...new Set(partiesData.map(p => p.political_party))];
          setExistingParties(uniqueParties as string[]);
        } else {
          setExistingParties(['INDEPENDENT']);
        }

        // 6. Pre-fill form if editMode=appeal
        if (editMode === 'appeal' && formsData) {
          const { data: resp } = await supabase
            .from('form response')
            .select('id')
            .eq('formId', formsData.id)
            .eq('userID', userContext.userId)
            .maybeSingle();

          if (resp) {
            const { data: vals } = await supabase
              .from('form response value')
              .select('fieldID, value')
              .eq('responseID', resp.id);

            if (vals) {
              const initialData: Record<string, any> = {};
              vals.forEach(v => {
                initialData[v.fieldID] = v.value;
              });
              setFormData(initialData);
            }
          }
        }

      } catch (err) {
        console.error("Error fetching form configuration", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFormAndFields();
  }, [userContext, election?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formConfig) {
        throw new Error('Form configuration is missing.');
      }

      // 1. Get or create "form response"
      let responseId = null;

      if (editMode === 'appeal') {
        const { data: existingResp } = await supabase
          .from('form response')
          .select('id')
          .eq('formId', formConfig.id)
          .eq('userID', userContext!.userId)
          .maybeSingle();
        if (existingResp) responseId = existingResp.id;
      }

      if (!responseId) {
        const { data: responseData, error: responseError } = await supabase
          .from('form response')
          .insert({
            formId: formConfig.id,
            userID: userContext!.userId,
            submittedAt: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (responseError) throw responseError;
        responseId = responseData.id;
      }

      // 2. Fetch existing response values if responseId exists to match IDs for standard upsert
      let existingValues: any[] = [];
      if (responseId) {
        const { data: existingData } = await supabase
          .from('form response value')
          .select('id, fieldID')
          .eq('responseID', responseId);
        if (existingData) {
          existingValues = existingData;
        }
      }

      // 3. Prepare array of values for "form response value", handling file uploads
      const responseValues = await Promise.all(
        Object.entries(formData).map(async ([fieldId, value]) => {
          let finalValue = String(value);

          // If the value is a File, upload it to Supabase Storage
          if (value instanceof File) {
            const fileExt = value.name.split('.').pop();
            const fileName = `${fieldId}_${Date.now()}.${fileExt}`;
            const filePath = `${tenant.slug}/${election.slug}/${userContext!.userId}/${fileName}`;

            // Upload the file to a bucket named 'candidate-uploads'
            const { error: uploadError } = await supabase.storage
              .from('candidate-uploads')
              .upload(filePath, value, { upsert: true });

            if (uploadError) {
              throw new Error(`Failed to upload ${value.name}: ${uploadError.message}`);
            }

            // Retrieve the public URL for the uploaded file
            const { data: publicUrlData } = supabase.storage
              .from('candidate-uploads')
              .getPublicUrl(filePath);

            finalValue = publicUrlData.publicUrl;
          }

          const existingValue = existingValues.find(v => v.fieldID === fieldId);

          return {
            ...(existingValue ? { id: existingValue.id } : {}),
            responseID: responseId,
            fieldID: fieldId,
            value: finalValue
          };
        })
      );

      // 4. Upsert into "form response value"
      if (responseValues.length > 0) {
        const { error: valuesError } = await supabase
          .from('form response value')
          .upsert(responseValues);

        if (valuesError) throw valuesError;
      }

      // Find the position numeric ID if a position was selected
      let candidatePositionId = null;
      const positionField = formFields.find(f => f.fieldType === 'position_selector');

      if (positionField && formData[positionField.id]) {
        const selectedTitle = formData[positionField.id].toLowerCase().trim();
        const matchedPosition = positions.find(p => p.title.toLowerCase().trim() === selectedTitle);
        if (matchedPosition) {
          candidatePositionId = matchedPosition.id;
        }
      }

      // 4. Update candidate status to PENDING_VERIFICATION and link positionID
      const updatePayload: any = { status: 'PENDING_VERIFICATION' };
      if (candidatePositionId) {
        updatePayload.positionID = candidatePositionId;
      }
      if (formConfig?.custom_logic_meta?.hasParty) {
        updatePayload.political_party = politicalParty.trim() || 'INDEPENDENT';
      }

      const { error: statusUpdateError } = await supabase
        .from('candidate')
        .update(updatePayload)
        .eq('userID', userContext!.userId)
        .eq('electionID', election.id);

      if (statusUpdateError) throw statusUpdateError;

      // If this submission was allowed because of an approved appeal,
      // decrement the edits_remaining_after_appeal counter via RPC.
      try {
        await supabase.rpc('decrement_candidate_edits_after_appeal', { user_id: userContext!.userId, election_id: election.id });
      } catch (e) {
        // Non-fatal — submission succeeded; log for investigation
        console.warn('Failed to decrement edits_remaining_after_appeal', e);
      }

      router.push(`/${tenant.slug}/${election.slug}/candidate-dashboard`);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An error occurred while submitting the form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12 px-6 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
        <p className="text-slate-400 font-medium animate-pulse">Loading Application Form...</p>
      </div>
    );
  }

  if (!userContext?.userId || userContext.userType !== 'Candidate') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-500">Only candidates can access this form.</p>
        </div>
      </div>
    );
  }

  if (!formConfig || formFields.length === 0) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full text-center">
          <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Form Not Configured</h2>
          <p className="text-slate-500 text-lg">
            The election organizers have not yet configured the application fields for this election.
          </p>
          <button
            onClick={() => router.push(`/${tenant.slug}/${election.slug}/file`)}
            className="mt-8 px-6 py-3 bg-[var(--tenant-primary)] text-white font-bold rounded-xl"
          >
            Go to Status Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden py-16 px-6">
      <PublicElectionBackgroundLayer imageUrl={backgroundImage} />
      <div className="pointer-events-none absolute left-[-8rem] top-20 z-0 h-80 w-80 rounded-full bg-[var(--tenant-primary)]/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-[-7rem] z-0 h-96 w-96 rounded-full bg-[var(--tenant-secondary)]/15 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-12 border-b border-white/20 pb-8">
          <h1 className="text-4xl font-black text-slate-950 mb-2 tracking-tight">Candidacy Application</h1>
          <p className="text-slate-700 text-lg font-semibold">
            Please complete all required fields. Your application will be reviewed according to the election rules.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/75 p-8 md:p-12 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--tenant-primary)_0%,var(--tenant-third)_50%,var(--tenant-secondary)_100%)] opacity-[0.05]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {formConfig?.custom_logic_meta?.hasParty && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                Electoral Party Affiliation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="party-list"
                placeholder="Type or select a party"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
                style={{ color: '#0f172a' }}
                value={politicalParty}
                onChange={(e) => setPoliticalParty(e.target.value)}
              />
              <datalist id="party-list">
                {existingParties.map((party, idx) => (
                  <option key={idx} value={party} />
                ))}
              </datalist>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Leave as Independent or choose your party affiliation.
              </p>
            </div>
          )}

          {formFields.map((field) => {
            // Find if there is a phase rule specific to this field
            const relatedRule = phaseRules.find(r => r.condition_logic?.fieldId === field.id);

            return (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-bold text-slate-950">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.fieldType === 'short_text' && (
                  <input
                    type="text"
                    required={field.required}
                    placeholder={field.validationRules?.placeholder || ''}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
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
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
                    style={{ color: '#0f172a' }}
                    value={formData[field.id] || ''}
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
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
                    style={{ color: '#0f172a' }}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                )}

                {field.fieldType === 'email' && (
                  <input
                    type="email"
                    required={field.required}
                    placeholder={field.validationRules?.placeholder || ''}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
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
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
                    style={{ color: '#0f172a' }}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.fieldType === 'date' && (
                  <input
                    type="date"
                    required={field.required}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl [color-scheme:light]"
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
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
                    style={{ color: '#0f172a' }}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.fieldType === 'position_selector' && (
                  <select
                    required={field.required}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
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

                {['dropdown', 'radio'].includes(field.fieldType) && (
                  <select
                    required={field.required}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all shadow-sm backdrop-blur-xl"
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
                      {field.validationRules?.placeholder || 'I agree to follow the policies'}
                    </label>
                  </div>
                )}

                {field.fieldType === 'file_upload' && (
                  <input
                    type="file"
                    required={field.required}
                    accept={field.validationRules?.allowedTypes ? `.${field.validationRules.allowedTypes.replace(/,/g, ',.')}` : undefined}
                    className="w-full bg-white/50 border border-white/70 rounded-xl px-4 py-3 !text-slate-900 font-semibold shadow-sm backdrop-blur-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[var(--tenant-primary)] file:text-slate-950 hover:file:opacity-90"
                    style={{ color: '#0f172a' }}
                    onChange={(e) => handleInputChange(field.id, e.target.files?.[0])}
                  />
                )}

                {/* Display Rule / Help text */}
                {(field.validationRules?.helpText || relatedRule) && (
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {field.validationRules?.helpText}
                    {relatedRule && (
                      <span className="block mt-1 text-amber-700 bg-amber-50/70 inline-block px-2 py-1 rounded border border-amber-200">
                        ⚠️ Rule: {relatedRule.label}
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-8 mt-8 border-t border-white/20 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90 text-slate-950 font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
