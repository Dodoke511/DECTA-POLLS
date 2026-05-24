"use client";

import React, { useState, useEffect } from "react";

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (formData: typeof initialForm) => void;
  isInvitation?: boolean;
  isSaving?: boolean;
  initialData?: Partial<typeof initialForm>;
  title?: string;
  description?: string;
  submitButtonText?: string;
}

const initialForm = {
  email: "",
  first_name: "",
  middle_name: "",
  surname: "",
  contact: "",
  birth_date: "",
};

export function AssignUserModal({ 
  isOpen, 
  onClose, 
  onAssign, 
  isInvitation = true, 
  isSaving = false,
  initialData,
  title = "Assign Role",
  description = "Enter the user details you wish to assign this role to.",
  submitButtonText = "Assign User"
}: AssignUserModalProps) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen && initialData) {
      setForm((prev) => ({
        ...prev,
        email: initialData.email ?? prev.email,
        first_name: initialData.first_name ?? prev.first_name,
        middle_name: initialData.middle_name ?? "",
        surname: initialData.surname ?? prev.surname,
        contact: initialData.contact ?? "",
        birth_date: initialData.birth_date ?? "",
      }));
    } else if (!isOpen) {
      setForm(initialForm); // Reset when closing
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onAssign(form);
    // Note: We don't reset form or close here anymore, 
    // we let the parent handle it after successful API call
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090215]/80 backdrop-blur-sm px-4">
      <div className="super-admin-sidebar w-full max-w-xl max-h-[85vh] shrink-0 flex flex-col !rounded-[28px] border p-6 md:p-8 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        <h2 className="mb-2 text-2xl font-bold relative z-10" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>{title}</h2>
        <p className="text-[13px] text-white/50 mb-6 relative z-10">{description}</p>
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pr-2">
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Middle Name</label>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Surname</label>
                <input
                  type="text"
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
                />
              </div>
            </div>

            {!isInvitation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Contact Number</label>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Birth Date</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-3 relative z-10 pt-4 border-t border-white/[0.05]">
          <button
            onClick={onClose}
            className="rounded-[14px] px-6 py-3 text-[14px] font-bold text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.email || isSaving}
            className={`rounded-[14px] px-7 py-3 text-[14px] font-bold text-white shadow-[0_4px_20px_rgb(79,53,205,0.4)] transition-all ${
              !form.email || isSaving
                ? "opacity-50 cursor-not-allowed bg-white/10"
                : "bg-[#4f35cd] hover:bg-[#5D44F8] hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isSaving ? "Saving..." : submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
