"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CandidacyFormPage() {
  const { userContext, tenant, election } = useElectionPublic();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [phaseRules, setPhaseRules] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
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
          .select('id, status')
          .eq('userID', userContext.userId)
          .eq('electionID', election.id)
          .maybeSingle();

        if (candidateData) {
          setCandidateStatus(candidateData.status);
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
          .select('title')
          .eq('electionID', election.id)
          .order('order_index', { ascending: true });

        if (positionsData) {
          setPositions(positionsData);
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

      // 1. Insert into "form response"
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

      // 2. Prepare array of values for "form response value", handling file uploads
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

          return {
            responseID: responseData.id,
            fieldID: fieldId,
            value: finalValue
          };
        })
      );

      // 3. Insert into "form response value"
      if (responseValues.length > 0) {
        const { error: valuesError } = await supabase
          .from('form response value')
          .insert(responseValues);

        if (valuesError) throw valuesError;
      }

      // 4. Update candidate status to PENDING_VERIFICATION
      const { error: statusUpdateError } = await supabase
        .from('candidate')
        .update({ status: 'PENDING_VERIFICATION' })
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

  if (!userContext?.userId || userContext.isVoter) {
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
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="mb-12 border-b border-slate-100 pb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Candidacy Application</h1>
        <p className="text-slate-500 text-lg">
          Please complete all required fields. Your application will be reviewed according to the election rules.
        </p>
      </div>

      <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-xl">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {formFields.map((field) => {
            // Find if there is a phase rule specific to this field
            const relatedRule = phaseRules.find(r => r.condition_logic?.fieldId === field.id);

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

                {/* Display Rule / Help text */}
                {(field.validationRules?.helpText || relatedRule) && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {field.validationRules?.helpText}
                    {relatedRule && (
                      <span className="block mt-1 text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded">
                        ⚠️ Rule: {relatedRule.label}
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-8 mt-8 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
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
  );
}
