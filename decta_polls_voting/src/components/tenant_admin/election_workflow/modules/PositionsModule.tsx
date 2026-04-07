"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function PositionsModule({ electionId }: { electionId: string }) {
  const { control, register, handleSubmit } = useForm({
    defaultValues: {
      positions: [{ title: "", maxWinners: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "positions"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const response = await fetch('/api/save_positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          electionId,
          positions: data.positions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save positions via API");
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Database Save Error:", err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-16 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#1C162E]/90 backdrop-blur-2xl border border-white/5 rounded-[24px] p-8 md:p-10 shadow-[0_16px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-[#A78BFA] opacity-[0.03] blur-[100px] pointer-events-none rounded-full" />
        
        <h2 className="text-[22px] font-semibold text-white mb-6 relative z-10">Create Electoral Positions (required)</h2>
        
        <div className="w-full h-px bg-white/10 mb-8 relative z-10" />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 relative z-10">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 group bg-white/[0.02] p-2 rounded-2xl border border-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300">
              <div className="flex-1 w-full relative">
                <input
                  {...register(`positions.${index}.title`, { required: true })}
                  placeholder="Enter position name"
                  className="w-full bg-[#110D1E]/80 border border-white/10 text-white placeholder-white/30 rounded-xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] transition-all duration-300 text-[15px]"
                />
              </div>
              <div className="w-full sm:w-36 shrink-0">
                 <input
                  type="number"
                  min="1"
                  {...register(`positions.${index}.maxWinners`)}
                  placeholder="Seats"
                  className="w-full bg-[#110D1E]/80 border border-white/10 text-white placeholder-white/30 rounded-xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] transition-all duration-300 text-[15px]"
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                <button 
                  type="button" 
                  onClick={() => append({ title: "", maxWinners: 1 })}
                  className="w-12 h-[54px] flex items-center justify-center bg-[#110D1E]/80 border border-white/5 text-[#A78BFA] hover:bg-[#A78BFA]/10 hover:border-[#A78BFA]/30 transition-all rounded-xl shadow-inner shrink-0 group-hover:opacity-100"
                  title="Add position below"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {fields.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => remove(index)}
                    className="w-12 h-[54px] flex items-center justify-center bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all rounded-xl shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t border-white/5">
            {saveStatus === "error" && (
              <span className="text-red-400 text-sm font-medium">Failed to save positions.</span>
            )}
            {saveStatus === "success" && (
              <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Saved perfectly!
              </span>
            )}
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-[#6648EB] hover:bg-[#7b61ff] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-white text-[15px] font-semibold py-3 px-10 rounded-xl shadow-[0_4px_24px_rgba(102,72,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
