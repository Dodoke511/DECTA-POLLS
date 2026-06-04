import React, { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { evaluateCondition } from '@/lib/rules/evaluators';
import { authFetch } from '@/lib/authFetch';

interface ApplicationViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
  electionId: string;
  onStatusUpdate: (candidateId: string, status: string) => Promise<void>;
  onRejectTrigger?: (candidate: any) => void;
  subscription: string;
  isScreeningEnabled: boolean;
  currentPhaseType?: string | null;
}

export function ApplicationViewerModal({
  isOpen, onClose, candidate, electionId, onStatusUpdate, onRejectTrigger, subscription, isScreeningEnabled, currentPhaseType
}: ApplicationViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [responseValues, setResponseValues] = useState<any[]>([]);
  const [phaseRules, setPhaseRules] = useState<any[]>([]);
  const [failedRules, setFailedRules] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && candidate?.user?.id && electionId) {
      fetchApplication();
    }
  }, [isOpen, candidate, electionId]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/interface/candidates/get_application?userId=${candidate.user.id}&electionId=${electionId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Parse validation rules
        const parsedFields = (data.formFields || []).map((f: any) => {
          if (typeof f.validationRules === 'string') {
            try { f.validationRules = JSON.parse(f.validationRules); } catch (e) {}
          }
          return f;
        });

        setFormFields(parsedFields);
        setResponseValues(data.responseValues || []);
        setPhaseRules(data.phaseRules || []);

        // Evaluate Rules if screening is enabled and subscription allows
        if (isScreeningEnabled || ['STANDARD', 'ENTERPRISE'].includes(subscription.toUpperCase())) {
          evaluateRules(parsedFields, data.responseValues || [], data.phaseRules || []);
        }

        // If simple view (no screening), update to ACKNOWLEDGED if PENDING
        if (!isScreeningEnabled && candidate.status === 'PENDING_VERIFICATION') {
          await onStatusUpdate(candidate.id, 'ACKNOWLEDGED');
        }
      }
    } catch (err) {
      console.error('Failed to fetch application:', err);
    } finally {
      setLoading(false);
    }
  };

  const evaluateRules = (fields: any[], values: any[], rules: any[]) => {
    const failed: any[] = [];
    rules.forEach(rule => {
      let logic = rule.conditionLogic;
      if (typeof logic === 'string') {
        try { logic = JSON.parse(logic); } catch (e) {}
      }

      if (logic && logic.fieldId) {
        const valObj = values.find(v => v.fieldID === logic.fieldId);
        const actualValue = valObj ? valObj.value : null;

        const passed = evaluateCondition(logic.operator, actualValue, logic.value);

        if (!passed) {
          failed.push({ ...rule, logic });
        }
      }
    });

    setFailedRules(failed);
  };

  const handleApplyDecision = async (rule: any) => {
    const targetStatus = rule.actionType === 'auto_reject' ? 'REJECTED' : 'FLAGGED';
    if (targetStatus === 'REJECTED' && onRejectTrigger) {
      onClose();
      onRejectTrigger(candidate);
    } else {
      await onStatusUpdate(candidate.id, targetStatus);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isScreeningOrAppeals = currentPhaseType === 'screening' || currentPhaseType === 'appeals';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Application Review</h2>
            <p className="text-sm text-white/50">{candidate?.user?.first_name} {candidate?.user?.surname}</p>
            {candidate?.political_party && (
              <div className="mt-1">
                <span className="text-xs text-[var(--tenant-primary)] font-semibold border border-[var(--tenant-primary)]/20 bg-[var(--tenant-primary)]/10 px-2 py-0.5 rounded-full inline-block">
                  {candidate.political_party}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
              <p className="text-white/40 text-sm">Loading Candidate Data...</p>
            </div>
          ) : (
            <>
              {/* Screening Alerts */}
              {isScreeningOrAppeals && failedRules.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <h3 className="text-red-400 font-bold">Screening Criteria Failed</h3>
                  </div>
                  <ul className="space-y-3 mt-4">
                    {failedRules.map((rule, idx) => {
                      const isFieldMissing = !formFields.some(f => f.id === rule.logic?.fieldId);
                      return (
                        <li key={idx} className="flex flex-col gap-2">
                          <div className="text-sm text-white/80">
                            <span className="font-semibold text-white">
                              {rule.label || `Unnamed Rule (Field: ${rule.logic?.fieldName || 'Unknown'})`}
                            </span>
                            {': '}
                            {rule.message || rule.error_message || 'Criteria not met for this field.'}
                            {isFieldMissing && (
                              <span className="block mt-1 text-xs text-red-400 font-medium">
                                ⚠ This rule points to a deleted field and automatically fails.
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleApplyDecision(rule)}
                            className="self-start text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Apply {rule.actionType === 'auto_reject' ? 'Rejection' : 'Flag'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Read-Only Form */}
              <div className="space-y-6">
                {formFields.map(field => {
                  const valObj = responseValues.find(v => v.fieldID === field.id);
                  const isFailed = failedRules.some(r => r.logic?.fieldId === field.id);
                  const showFailedHighlight = isScreeningOrAppeals && isFailed;
                  
                  return (
                    <div key={field.id} className={`p-4 rounded-xl border ${showFailedHighlight ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                      <label className="block text-sm font-bold text-white/70 mb-2 flex items-center justify-between">
                        {field.label}
                        {showFailedHighlight && <span className="text-red-400 text-xs px-2 py-0.5 bg-red-500/10 rounded-full">Failed Requirement</span>}
                      </label>
                      
                      {field.fieldType === 'file_upload' ? (
                        <div className="mt-2">
                          {valObj?.value ? (
                            <a href={valObj.value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm font-medium">
                              View Uploaded File
                            </a>
                          ) : (
                            <span className="text-white/30 text-sm">No file uploaded</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-white/90 font-medium">
                          {valObj?.value || <span className="text-white/20 italic">No answer provided</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {formFields.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    No application form data found.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
