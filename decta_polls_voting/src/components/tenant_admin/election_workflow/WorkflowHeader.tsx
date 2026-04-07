import React, { useState, useEffect } from 'react';
import { Palette, Eye, Undo, Redo } from 'lucide-react';
import { createClient } from '@supabase/supabase-js'

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
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#140B2D]/80 backdrop-blur-md border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center overflow-hidden border border-white/20 shadow-inner">
          {/* Add project logo if any */}
          {banner && <img src={banner} alt="Banner" className="w-full h-full object-cover" />}
        </div>
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
          className="bg-transparent border-none text-white/90 text-[1.1rem] font-medium focus:outline-none focus:ring-0 placeholder:text-white/40 w-[250px]"
        />
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
