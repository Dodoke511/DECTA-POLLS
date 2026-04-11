"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Loader2, CheckCircle2, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";

export function PositionsModule({ electionId, onSaveSuccess }: { electionId: string, onSaveSuccess?: () => void }) {
  const { control, register, handleSubmit, reset } = useForm({
    defaultValues: {
      positions: [{ title: "", maxWinners: 1 }]
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "positions"
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await fetch(`/api/get_positions?electionId=${electionId}`);
        if (!response.ok) throw new Error("Failed to fetch positions");
        const data = await response.json();
        reset({ positions: data.positions });
      } catch (err) {
        console.error("Error fetching positions:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchPositions();
  }, [electionId, reset]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveStatus("saving");
    try {
      const response = await fetch('/api/save_positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, positions: data.positions }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSaveStatus("success");
      onSaveSuccess?.();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Positions save error:", err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-16 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isFetching ? (
        <div className="flex flex-col items-center justify-center h-48 relative z-10 space-y-4">
          <div className="loader font-montserrat font-bold text-white text-xl">
            Loading
            <div className="words ml-2">
              <span className="word">Positions</span>
              <span className="word">Hierarchy</span>
              <span className="word">Data</span>
              <span className="word">Module</span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 relative z-10">
          {fields.map((field, index) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  move(draggedIndex, index);
                }
                setDraggedIndex(null);
              }}
              className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-4 group bg-white/[0.02] p-2 rounded-2xl border ${draggedIndex === index ? 'border-[#8b5cf6] opacity-60' : 'border-white/[0.02] hover:border-white/10'} hover:bg-white/[0.04] transition-all duration-300 relative`}
            >
              <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/80 p-2 sm:p-0 sm:pl-2 shrink-0 transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>

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

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5 px-2">
            <div className="flex flex-col">
              <p className="text-[11px] text-white/20 uppercase tracking-[0.2em] font-bold">
                Electoral Hierarchy
              </p>
              <p className="text-[10px] text-white/10 mt-1">Required step for candidates and ballots</p>
            </div>

            <div className="flex items-center gap-4">
              {saveStatus === "error" && (
                <span className="text-red-400 text-[12px] font-medium">Failed to save positions.</span>
              )}
              {saveStatus === "success" && (
                <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Positions Persisted
                </span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#6648EB] hover:bg-[#7b61ff] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold py-3 px-8 rounded-xl shadow-[0_8px_32px_rgba(102,72,235,0.3)] transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Positions Hierarchy"
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
