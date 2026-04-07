"use client";

import React, { useState, useRef } from "react";
import { X, Upload, ImageIcon, Loader2, CalendarDays } from "lucide-react";

interface CreateElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (electionId: string, token: string, electionTitle: string, banner: string | null) => void;
  tenantId: string;
  token: string;
}

interface FormData {
  title: string;
  startDate: string;
  endDate: string;
  banner: File | null;
}

interface FormErrors {
  title?: string;
  startDate?: string;
  endDate?: string;
  banner?: string;
}

export function CreateElectionModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  token,
}: CreateElectionModalProps) {
  const [form, setForm] = useState<FormData>({
    title: "",
    startDate: "",
    endDate: "",
    banner: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = "Election title is required.";
    if (!form.startDate) newErrors.startDate = "Start date is required.";
    if (!form.endDate) newErrors.endDate = "End date is required.";
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      newErrors.endDate = "End date must be after start date.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, banner: "Please select a valid image file." }));
        return;
      }
      setForm((prev) => ({ ...prev, banner: file }));
      setErrors((prev) => ({ ...prev, banner: undefined }));
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, banner: "Please select a valid image file." }));
        return;
      }
      setForm((prev) => ({ ...prev, banner: file }));
      setErrors((prev) => ({ ...prev, banner: undefined }));
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = new FormData();
      payload.append("tenantId", tenantId);
      payload.append("title", form.title.trim());
      payload.append("startDate", form.startDate);
      payload.append("endDate", form.endDate);
      if (form.banner) payload.append("banner", form.banner);

      const res = await fetch("/api/create_election", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create election.");
      }

      onSuccess(data.electionId, token, form.title, data.banner);
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm({ title: "", startDate: "", endDate: "", banner: null });
    setBannerPreview(null);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(12px)", background: "rgba(3,7,15,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(93,68,248,0.25)] overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(45,21,112,0.6) 0%, rgba(24,13,66,0.9) 60%, rgba(9,2,21,0.95) 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">New Election</h2>
            <p className="text-sm text-white/40 mt-1">Fill in the details to create a draft.</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
              Election Title <span className="text-[#5D44F8]">*</span>
            </label>
            <input
              id="election-title"
              type="text"
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. CIT-U SSG Elections 2025"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
                Start Date <span className="text-[#5D44F8]">*</span>
              </label>
              <div className="relative">
                <input
                  id="election-start-date"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, startDate: e.target.value }));
                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: undefined }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all [color-scheme:dark]"
                />
              </div>
              {errors.startDate && <p className="text-xs text-red-400">{errors.startDate}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
                End Date <span className="text-[#5D44F8]">*</span>
              </label>
              <div className="relative">
                <input
                  id="election-end-date"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, endDate: e.target.value }));
                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: undefined }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all [color-scheme:dark]"
                />
              </div>
              {errors.endDate && <p className="text-xs text-red-400">{errors.endDate}</p>}
            </div>
          </div>

          {/* Banner Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
              Banner <span className="text-white/25">(optional)</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-white/15 hover:border-[#5D44F8]/60 bg-white/5 hover:bg-white/8 transition-all overflow-hidden"
              style={{ minHeight: "120px" }}
            >
              {bannerPreview ? (
                <div className="relative w-full h-32 group">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white/80 text-xs font-medium">Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <ImageIcon className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-sm text-white/40">
                    <span className="text-[#5D44F8] font-medium">Click to upload</span> or drag & drop
                  </p>
                  <p className="text-xs text-white/25">PNG, JPG, WEBP recommended</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {errors.banner && <p className="text-xs text-red-400">{errors.banner}</p>}
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              id="create-election-submit"
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #5D44F8 0%, #7c60ff 100%)", boxShadow: "0 0 24px rgba(93,68,248,0.4)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
