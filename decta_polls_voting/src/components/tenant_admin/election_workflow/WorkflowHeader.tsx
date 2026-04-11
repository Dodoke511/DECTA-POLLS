"use client";

import React, { useState, useEffect } from 'react';
import { Palette, Eye, Undo, Redo, ChevronLeft } from 'lucide-react';
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

  useEffect(() => {
    if (electionTitle) {
      setLocalTitle(electionTitle);
    }
  }, [electionTitle]);

  const handleSave = () => {
    // Optionally avoid redundant saves
    if (localTitle.trim() && localTitle.trim() !== electionTitle) {
      updateElectionTitle(electionId, localTitle.trim());
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
    <div className="flex items-center justify-between px-6 py-4 bg-[#140B2D]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={returnToDashboard}
          title="Return to Dashboard"
          className="mr-2 flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 pr-0.5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center overflow-hidden border border-white/20 shadow-inner">
          {/* Add project logo if any */}
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
          {/* Highlight Underline */}
          <div className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-white transform origin-left transition-all duration-500 group-focus-within/header:w-full group-hover/header:w-[40px] opacity-0 group-focus-within/header:opacity-100 group-hover/header:opacity-40" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-white/60 hover:text-white transition-colors" title="Customize Theme">
          <Palette className="w-5 h-5" />
        </button>
        <button className="text-white/60 hover:text-white transition-colors" title="Preview">
          <Eye className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 border-l border-white/10 pl-6 border-r pr-6">
          <button className="text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/60" disabled title="Undo">
            <Undo className="w-5 h-5" />
          </button>
          <button className="text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/60" disabled title="Redo">
            <Redo className="w-5 h-5" />
          </button>
        </div>
        <button className="bg-white/10 hover:bg-white/20 text-white/90 font-semibold px-6 py-2.5 rounded-xl transition-all backdrop-blur-sm border border-white/10 shadow-lg select-none">
          Publish
        </button>
      </div>
    </div>
  );
}
