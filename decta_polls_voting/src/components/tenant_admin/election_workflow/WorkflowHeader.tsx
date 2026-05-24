"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface WorkflowHeaderProps {
  electionTitle: string | null;
  banner: string | null;
  electionId: string;
}

async function updateElectionTitle(electionId: string, title: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  try {
    const { data, error } = await supabase
      .from('election')
      .update({ title })
      .eq('id', electionId);
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating election title:', error);
    return null;
  }
}

export function WorkflowHeader({ electionTitle, banner, electionId }: WorkflowHeaderProps) {
  const router = useRouter();
  const [localTitle, setLocalTitle] = useState(electionTitle || "Untitled Election...");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{ type: 'error' | 'success', text: string, details?: string[] } | null>(null);

  useEffect(() => {
    if (electionTitle) {
      setLocalTitle(electionTitle);
    }
  }, [electionTitle]);

  const handleSave = () => {
    if (localTitle.trim() && localTitle.trim() !== electionTitle) {
      updateElectionTitle(electionId, localTitle.trim());
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishMessage(null);
    const token = sessionStorage.getItem('supabaseToken');

    try {
      const res = await fetch('/api/interface/publish_election', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ electionId })
      });

      const data = await res.json();

      if (res.ok) {
        setPublishMessage({ type: 'success', text: 'Election Published Successfully!' });
        
        // Redirect back to elections page after 1.5 seconds
        setTimeout(() => {
          const tenantToken = sessionStorage.getItem('tenantToken');
          const p = new URLSearchParams();
          p.set('role', 'tenant');
          if (tenantToken) p.set('random', tenantToken);
          
          router.push('/loader?destination=' + encodeURIComponent('/users/tenant/elections?' + p.toString()));
        }, 1500);
      } else {
        setPublishMessage({ 
          type: 'error', 
          text: data.error || 'Failed to publish.',
          details: data.details 
        });
      }
    } catch (err) {
      setPublishMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const returnToDashboard = () => {
    const token = sessionStorage.getItem('tenantToken');
    const params = new URLSearchParams();
    params.set('role', 'tenant');
    if (token) params.set('random', token);

    router.push('/loader?destination=' + encodeURIComponent('/users/tenant/dashboard?' + params.toString()));
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-6 py-4 bg-[#140B2D]/80 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={returnToDashboard}
            title="Return to Dashboard"
            className="mr-2 flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 pr-0.5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center overflow-hidden border border-white/20 shadow-inner">
            {banner && <img src={banner} alt="Banner" className="w-full h-full object-cover" />}
          </div>
          <div className="relative group/header flex items-center h-full">
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="bg-transparent border-none text-white/90 text-[1.1rem] font-bold tracking-tight outline-none transition-all duration-500 cursor-text hover:bg-white/5 rounded-lg px-3 py-1.5 -ml-3 placeholder:text-white/20 w-[300px]"
            />
            <div className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-white transform origin-left transition-all duration-500 group-focus-within/header:w-full group-hover/header:w-[40px] opacity-0 group-focus-within/header:opacity-100 group-hover/header:opacity-40" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className={`
              bg-white/10 hover:bg-white/20 text-white/90 font-semibold px-6 py-2.5 rounded-xl transition-all backdrop-blur-sm border border-white/10 shadow-lg select-none flex items-center gap-2
              ${isPublishing ? 'opacity-50 cursor-wait' : 'hover:scale-105 active:scale-95'}
            `}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Election'
            )}
          </button>
        </div>
      </div>

      {/* Notifications Overlay */}
      {publishMessage && (
        <div className="absolute top-full left-0 right-0 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="max-w-xl mx-auto mt-4 px-6 pointer-events-auto">
            <div className={`
              p-4 rounded-2xl border shadow-2xl backdrop-blur-2xl
              ${publishMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'}
            `}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold flex items-center gap-2">
                  {publishMessage.type === 'success' ? '✓' : '⚠'} {publishMessage.text}
                </p>
                <button onClick={() => setPublishMessage(null)} className="text-white/40 hover:text-white">✕</button>
              </div>
              {publishMessage.details && publishMessage.details.length > 0 && (
                <ul className="text-xs space-y-1 opacity-80 list-disc list-inside">
                  {publishMessage.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
