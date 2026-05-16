"use client";

import React, { useState, useRef } from "react";
import { X, ImageIcon, Loader2, Globe, Lock, Unlock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface CreateElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (electionId: string, token: string, electionTitle: string, banner: string | null) => void;
  tenantId: string;
  token: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  banner: File | null;
}

interface FormErrors {
  title?: string;
  slug?: string;
  description?: string;
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
    slug: "",
    description: "",
    banner: null,
  });
  const [slugLocked, setSlugLocked] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validate = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = "Election title is required.";
    
    if (!form.slug.trim()) {
      newErrors.slug = "URL slug is required.";
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens.";
    } else {
      // Check for uniqueness
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      
      const { data: existing } = await supabase
        .from('election')
        .select('id')
        .eq('slug', form.slug)
        .maybeSingle();
        
      if (existing) {
        newErrors.slug = "This URL slug is already taken. Please choose another.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_]+/g, '-')   // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, '');   // Trim hyphens
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm(prev => {
      const updates: Partial<FormData> = { title };
      if (!slugLocked) {
        updates.slug = generateSlug(title);
      }
      return { ...prev, ...updates };
    });
    if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
    if (!slugLocked && errors.slug) setErrors(prev => ({ ...prev, slug: undefined }));
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
    setIsSubmitting(true);
    setSubmitError(null);

    const isValid = await validate();
    if (!isValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append("tenantId", tenantId);
      payload.append("title", form.title.trim());
      payload.append("slug", form.slug.trim());
      payload.append("description", form.description.trim());
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
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm({ title: "", slug: "", description: "", banner: null });
    setSlugLocked(false);
    setBannerPreview(null);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      style={{ backdropFilter: "blur(12px)", background: "rgba(3,7,15,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative my-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_80px_rgba(93,68,248,0.25)] sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
        style={{ background: "linear-gradient(135deg, rgba(45,21,112,0.6) 0%, rgba(24,13,66,0.9) 60%, rgba(9,2,21,0.95) 100%)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8 sm:pt-8 sm:pb-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">New Election</h2>
            <p className="text-sm text-white/40 mt-1">Fill in the details to create a draft.</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-xl border border-white/10 p-2 text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="decta-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
              Election Title <span className="text-[#5D44F8]">*</span>
            </label>
            <input
              id="election-title"
              type="text"
              value={form.title}
              onChange={handleTitleChange}
              placeholder="e.g. CIT-U SSG Elections 2025"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all"
            />
            {errors.title && <p className="text-xs text-red-400 font-medium">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-2">
            <label className="flex items-start justify-between gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/50 sm:items-center">
              <span>URL Slug <span className="text-[#5D44F8]">*</span></span>
              <button 
                type="button"
                onClick={() => setSlugLocked(!slugLocked)}
                className="flex max-w-[12rem] items-center justify-end gap-1 text-right text-[10px] normal-case tracking-normal text-[#A78BFA] transition-colors hover:text-[#C4B5FD] sm:max-w-none sm:text-left"
              >
                {slugLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {slugLocked ? "Unlock Auto-sync" : "Lock for Custom URL"}
              </button>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <Globe className="w-4 h-4 text-white/20" />
                <span className="text-white/20 text-sm">/</span>
              </div>
              <input
                id="election-slug"
                type="text"
                value={form.slug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
                  setForm(prev => ({ ...prev, slug: val }));
                  if (errors.slug) setErrors(prev => ({ ...prev, slug: undefined }));
                  if (!slugLocked) setSlugLocked(true);
                }}
                placeholder="election-url-slug"
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all font-mono"
              />
            </div>
            {errors.slug && <p className="text-xs text-red-400 font-medium">{errors.slug}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em]">
              Description <span className="text-white/25">(optional)</span>
            </label>
            <textarea
              id="election-description"
              value={form.description}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="A short welcoming description for voters..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all resize-none"
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
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
              className="relative min-h-[120px] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-white/5 transition-all hover:border-[#5D44F8]/60 hover:bg-white/8"
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
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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
