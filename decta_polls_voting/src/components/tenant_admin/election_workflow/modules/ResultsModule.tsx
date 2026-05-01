'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  BarChart3, Settings2, Eye, Lock, Download, ShieldCheck, 
  Clock, Check, Loader2, Users, Zap, AlertCircle
} from 'lucide-react';
import { ResultsConfig, PublishMode, ResultsVisibility, DownloadFormat, DownloadVisibility } from '@/lib/types/results';
import { TenantRole } from '../PhaseCard';

interface ResultsModuleProps {
  electionId: string;
  subscription: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
  roles: TenantRole[];
  roleAssigned: string | null;
  onRoleChange: (roleId: string | null) => void;
}

export const ResultsModule = forwardRef<{ save: () => Promise<boolean> }, ResultsModuleProps>(
  ({ electionId, subscription, roles, roleAssigned, onRoleChange }, ref) => {
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [config, setConfig] = useState<ResultsConfig>({
      election_id: electionId,
      tenant_id: '',
      publish_mode: 'immediate',
      results_visibility: 'public',
      show_vote_counts: true,
      show_winner_prominently: true,
      show_turnout_stats: false,
      show_live_turnout: false,
      enable_results_download: false,
      download_format: 'pdf',
      download_visibility: 'public',
      enable_audit_export: false,
    });

    const isStandardPlus = subscription === 'STANDARD' || subscription === 'ENTERPRISE';
    const isEnterprise = subscription === 'ENTERPRISE';

    useEffect(() => {
      const fetchConfig = async () => {
        try {
          const response = await fetch(`/api/get_results_config?electionId=${electionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              setConfig(data);
            }
          }
        } catch (error) {
          console.error('Failed to fetch results config:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchConfig();
    }, [electionId]);

    const handleSave = useCallback(async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/save_results_config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ electionId, config }),
        });
        
        if (response.ok) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 2000);
          return true;
        } else {
          setSaveStatus('error');
          return false;
        }
      } catch (error) {
        setSaveStatus('error');
        return false;
      }
    }, [electionId, config]);

    useImperativeHandle(ref, () => ({
      save: handleSave
    }));

    if (loading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/20" />
        </div>
      );
    }

    const updateConfig = (updates: Partial<ResultsConfig>) => {
      setConfig((prev: ResultsConfig) => ({ ...prev, ...updates }));
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Results Publication */}
        <section className="!p-0 ">
          <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#5D44F8]" /> Results Publication
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['immediate', 'manual', 'scheduled'] as PublishMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => updateConfig({ publish_mode: mode })}
                className={`p-3 rounded-xl border text-left transition-all ${config.publish_mode === mode ? 'bg-[#4F46E5]/10 border-[#4F46E5]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <span className={`text-[12px] font-bold block capitalize ${config.publish_mode === mode ? 'text-white' : 'text-white/60'}`}>{mode}</span>
                <p className="text-[10px] text-white/30 mt-1">
                  {mode === 'immediate' && 'When voting closes'}
                  {mode === 'manual' && 'Admin publishes manually'}
                  {mode === 'scheduled' && 'At a specific time'}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-[11px] text-white/40 uppercase mb-3">Results Visible To</label>
            <div className="flex gap-2">
              {(['public', 'voters', 'organization'] as ResultsVisibility[]).map((vis) => (
                <button
                  key={vis}
                  onClick={() => updateConfig({ results_visibility: vis })}
                  className={`px-4 py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${config.results_visibility === vis ? 'bg-[#4F46E5]/20 border-[#4F46E5] text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  {vis}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Display Settings (All Tiers) */}
        <section>
          <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-[#5D44F8]" /> Display Settings
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
              <span className="text-[13px] text-white/70">Show vote counts for all candidates</span>
              <input
                type="checkbox"
                checked={config.show_vote_counts}
                onChange={(e) => updateConfig({ show_vote_counts: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#4F46E5] accent-[#5D44F8]"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
              <span className="text-[13px] text-white/70">Show winning candidate always on top of list</span>
              <input 
                type="checkbox" 
                checked={config.show_winner_prominently}
                onChange={(e) => updateConfig({ show_winner_prominently: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#4F46E5] accent-[#4F46E5]" />
            </label>
          </div>
        </section>

        {/* Analytics (Standard+) */}
        <section className={`p-5 rounded-2xl border transition-all ${isStandardPlus ? 'bg-white/3 border-white/10' : 'bg-white/[0.01] border-white/5 grayscale opacity-60'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Analytics
            </h4>
            {!isStandardPlus && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">STANDARD+</span>
            )}
          </div>
          
          <div className="space-y-4">
            <label className={`flex items-center justify-between cursor-pointer group ${!isStandardPlus && 'pointer-events-none'}`}>
              <div>
                <span className="text-[13px] font-medium text-white/80 block">Show voter turnout statistics</span>
                <span className="text-[11px] text-white/30">Displays participation rate on results page</span>
              </div>
              <div 
                onClick={() => isStandardPlus && updateConfig({ show_turnout_stats: !config.show_turnout_stats })}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.show_turnout_stats ? 'bg-amber-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.show_turnout_stats ? 'left-6' : 'left-1'}`} />
              </div>
            </label>

            <label className={`flex items-center justify-between cursor-pointer group ${!isStandardPlus && 'pointer-events-none'}`}>
              <div>
                <span className="text-[13px] font-medium text-white/80 block">Show live turnout during voting</span>
                <span className="text-[11px] text-white/30">Admins see real-time turnout gauge</span>
              </div>
              <div 
                onClick={() => isStandardPlus && updateConfig({ show_live_turnout: !config.show_live_turnout })}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.show_live_turnout ? 'bg-amber-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.show_live_turnout ? 'left-6' : 'left-1'}`} />
              </div>
            </label>

            <div className={`pt-4 border-t border-white/5 ${!isStandardPlus && 'opacity-50'}`}>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <span className="text-[13px] font-medium text-white/80">Enable results download</span>
                <div 
                  onClick={() => isStandardPlus && updateConfig({ enable_results_download: !config.enable_results_download })}
                  className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.enable_results_download ? 'bg-amber-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.enable_results_download ? 'left-6' : 'left-1'}`} />
                </div>
              </label>

              {config.enable_results_download && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase block mb-2">Format</label>
                    <select
                      value={config.download_format}
                      onChange={(e) => updateConfig({ download_format: e.target.value as DownloadFormat })}
                      className="w-full bg-white/5 border border-white/10 text-white/70 rounded-lg px-3 py-2 text-[12px] focus:outline-none"
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase block mb-2">Visible To</label>
                    <select
                      value={config.download_visibility}
                      onChange={(e) => updateConfig({ download_visibility: e.target.value as DownloadVisibility })}
                      className="w-full bg-white/5 border border-white/10 text-white/70 rounded-lg px-3 py-2 text-[12px] focus:outline-none"
                    >
                      <option value="public">Public</option>
                      <option value="admin">Admins only</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Advanced Analytics (Enterprise) */}
        <section className={`p-5 rounded-2xl border transition-all ${isEnterprise ? 'bg-[#4F46E5]/5 border-[#4F46E5]/20' : 'bg-white/[0.01] border-white/5 grayscale opacity-60'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4F46E5]" /> Advanced Analytics
            </h4>
            {!isEnterprise && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20">ENTERPRISE</span>
            )}
          </div>

          <label className={`flex items-center justify-between cursor-pointer group ${!isEnterprise && 'pointer-events-none'}`}>
            <div>
              <span className="text-[13px] font-medium text-white/80 block">Audit trail export</span>
              <span className="text-[11px] text-white/30 leading-tight">Full forensic audit log available after closing</span>
            </div>
            <div 
              onClick={() => isEnterprise && updateConfig({ enable_audit_export: !config.enable_audit_export })}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.enable_audit_export ? 'bg-[#4F46E5]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.enable_audit_export ? 'left-6' : 'left-1'}`} />
            </div>
          </label>
        </section>
      </div>
    );
  }
);

ResultsModule.displayName = 'ResultsModule';
