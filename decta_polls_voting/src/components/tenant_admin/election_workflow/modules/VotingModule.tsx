'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  Clock, Settings2, Layout, Image as ImageIcon, FileText, 
  ExternalLink, Check, AlertCircle, Loader2, Users 
} from 'lucide-react';
import { VotingConfig, VotingMethod, BallotLayout } from '@/lib/types/voting';
import { TenantRole } from '../PhaseCard';

interface VotingModuleProps {
  electionId: string;
  roles: TenantRole[];
  roleAssigned: string | null;
  onRoleChange: (roleId: string | null) => void;
}

export const VotingModule = forwardRef<{ save: () => Promise<boolean> }, VotingModuleProps>(
  ({ electionId, roles, roleAssigned, onRoleChange }, ref) => {
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [config, setConfig] = useState<VotingConfig>({
      election_id: electionId,
      tenant_id: '', // Will be set by API
      voting_start: new Date().toISOString(),
      voting_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      voting_method: 'standard',
      abstain_allowed: false,
      ballot_layout: 'single_page',
      show_candidate_photos: true,
      show_position_desc: true,
      show_candidate_listing_link: true,
    });

    useEffect(() => {
      const fetchConfig = async () => {
        try {
          const response = await fetch(`/api/get_voting_config?electionId=${electionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              setConfig(data);
            }
          }
        } catch (error) {
          console.error('Failed to fetch voting config:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchConfig();
    }, [electionId]);

    const handleSave = useCallback(async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/save_voting_config', {
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

    const updateConfig = (updates: Partial<VotingConfig>) => {
      setConfig(prev => ({ ...prev, ...updates }));
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Schedule */}
        <section className="!p-0 grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="col-span-full">
            <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#6648EB]" /> Schedule
            </h4>
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase mb-2">Voting Opens</label>
            <input
              type="datetime-local"
              value={config.voting_start.slice(0, 16)}
              onChange={(e) => updateConfig({ voting_start: new Date(e.target.value).toISOString() })}
              className="w-full bg-white/5 border border-white/10 text-white/80 rounded-xl p-3 text-[13px] focus:outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase mb-2">Voting Closes</label>
            <input
              type="datetime-local"
              value={config.voting_end.slice(0, 16)}
              onChange={(e) => updateConfig({ voting_end: new Date(e.target.value).toISOString() })}
              className="w-full bg-white/5 border border-white/10 text-white/80 rounded-xl p-3 text-[13px] focus:outline-none [color-scheme:dark]"
            />
            <p className="text-[10px] text-white/20 mt-2 italic">Transition is always deadline-based for voting</p>
          </div>
        </section>

        {/* Ballot Settings */}
        <section>
          <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-[#6648EB]" /> Ballot Settings
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => updateConfig({ voting_method: 'standard' })}
                className={`p-4 rounded-2xl border text-left transition-all ${config.voting_method === 'standard' ? 'bg-[#6648EB]/10 border-[#6648EB] shadow-[0_0_20px_rgba(102,72,235,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-bold ${config.voting_method === 'standard' ? 'text-white' : 'text-white/60'}`}>Standard Voting</span>
                  {config.voting_method === 'standard' && <Check className="w-4 h-4 text-[#6648EB]" />}
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">Select up to N candidates per position (Plurality)</p>
              </button>
              <button
                onClick={() => updateConfig({ voting_method: 'ranked' })}
                className={`p-4 rounded-2xl border text-left transition-all ${config.voting_method === 'ranked' ? 'bg-[#6648EB]/10 border-[#6648EB] shadow-[0_0_20px_rgba(102,72,235,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-bold ${config.voting_method === 'ranked' ? 'text-white' : 'text-white/60'}`}>Ranked Voting</span>
                  {config.voting_method === 'ranked' && <Check className="w-4 h-4 text-[#6648EB]" />}
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">Voters rank candidates in order of preference (IRV)</p>
              </button>
            </div>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer group hover:bg-white/8 transition-all">
              <div>
                <span className="text-[13px] font-bold text-white/80 block">Allow Abstain Votes</span>
                <span className="text-[11px] text-white/30">Adds an explicit "Abstain" option per position</span>
              </div>
              <div 
                onClick={() => updateConfig({ abstain_allowed: !config.abstain_allowed })}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.abstain_allowed ? 'bg-[#6648EB]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.abstain_allowed ? 'left-6' : 'left-1'}`} />
              </div>
            </label>
          </div>
        </section>

        {/* Ballot Appearance */}
        <section>
          <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Layout className="w-4 h-4 text-[#6648EB]" /> Ballot Appearance
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => updateConfig({ ballot_layout: 'single_page' })}
              className={`p-4 rounded-2xl border text-left transition-all ${config.ballot_layout === 'single_page' ? 'bg-[#6648EB]/10 border-[#6648EB]' : 'bg-white/5 border-white/10'}`}
            >
              <span className={`text-[13px] font-bold block mb-1 ${config.ballot_layout === 'single_page' ? 'text-white' : 'text-white/60'}`}>Single Page</span>
              <p className="text-[11px] text-white/40">All positions on one scrollable page</p>
            </button>
            <button
              onClick={() => updateConfig({ ballot_layout: 'step_by_step' })}
              className={`p-4 rounded-2xl border text-left transition-all ${config.ballot_layout === 'step_by_step' ? 'bg-[#6648EB]/10 border-[#6648EB]' : 'bg-white/5 border-white/10'}`}
            >
              <span className={`text-[13px] font-bold block mb-1 ${config.ballot_layout === 'step_by_step' ? 'text-white' : 'text-white/60'}`}>Step by Step</span>
              <p className="text-[11px] text-white/40">One position per screen with Next buttons</p>
            </button>
          </div>

          <div className="space-y-3">
            {[
              { id: 'show_candidate_photos', label: 'Show candidate photos', icon: ImageIcon },
              { id: 'show_position_desc', label: 'Show position descriptions', icon: FileText },
              { id: 'show_candidate_listing_link', label: 'Show candidate listing link', icon: ExternalLink },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
                <input
                  type="checkbox"
                  checked={config[item.id as keyof VotingConfig] as boolean}
                  onChange={(e) => updateConfig({ [item.id]: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#6648EB] focus:ring-[#6648EB]"
                />
                <div className="flex items-center gap-2">
                  <item.icon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[13px] text-white/70">{item.label}</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>
    );
  }
);

VotingModule.displayName = 'VotingModule';
