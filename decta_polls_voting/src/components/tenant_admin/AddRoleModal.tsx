"use client";

import React, { useState, useEffect } from "react";

export const PERMISSION_CATEGORIES = [
  {
    category: "Settings Management",
    minPlan: "STANDARD",
    permissions: [
      { id: "settings.global.view", label: "Access Global Configuration Panel" },
      { id: "settings.global.edit", label: "Edit Configurations" },
      { id: "settings.global.notifications", label: "Manage Notification Triggers" },
      { id: "settings.account.view", label: "Access Account Management Panel" },
      { id: "settings.account.edit", label: "Edit Account Info" },
      { id: "settings.subscription.manage", label: "Manage Subscription" },
      { id: "settings.roles.view", label: "Access Assigned Roles Panel" },
      { id: "settings.roles.assign", label: "Assign Roles" },
      { id: "settings.roles.edit", label: "Edit Permissions" },
      { id: "settings.roles.delete", label: "Delete Assigned Roles" },
    ]
  },

  {
    category: "Elections: Filing",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.filing.access", label: "Access Filing Page" },
      { id: "election.filing.insert", label: "Allow Insert" },
      { id: "election.filing.delete", label: "Allow Delete" },
      { id: "election.filing.update", label: "Allow Update" },
      { id: "election.filing.select", label: "Allow Select" },
    ]
  },
  {
    category: "Elections: Screening",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.screening.access", label: "Access Screening Page" },
      { id: "election.screening.insert", label: "Allow Insert Screening Criteria" },
      { id: "election.screening.review", label: "Allow Review Screening Criteria" },
      { id: "election.screening.delete", label: "Allow Delete Screening Criteria" },
      { id: "election.screening.update", label: "Allow Update Screening Criteria" },
      { id: "election.screening.approval", label: "Allow Edit and Update Approval Configuration" },
    ]
  },
  {
    category: "Elections: Appeal",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.appeal.access", label: "Access Appeal Page" },
      { id: "election.appeal.config.update", label: "Allow Update Appeal Configuration" },
      { id: "election.appeal.config.edit", label: "Allow Edit Appeal Configuration" },
      { id: "election.appeal.config.insert", label: "Allow Insert Appeal Configuration" },
      { id: "election.appeal.config.review", label: "Allow Review Appeal Configuration" },
    ]
  },
  {
    category: "Elections: Publication",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.publication.access", label: "Access Publication Page" },
      { id: "election.publication.insert", label: "Allow Insert Publication Configuration" },
      { id: "election.publication.delete", label: "Allow Delete Publication Configuration" },
      { id: "election.publication.update", label: "Allow Update Publication Configuration" },
    ]
  },

  {
    category: "Candidate Management",
    minPlan: "STANDARD",
    permissions: [
      { id: "candidate.access", label: "Access Candidates Page" },
      { id: "candidate.view", label: "View Candidates" },
      { id: "candidate.approve", label: "Approve Candidates" },
      { id: "document.view", label: "View Document" },
      { id: "document.reject", label: "Reject Document" },
      { id: "candidate.review", label: "Review Candidate" },
      { id: "document.verify", label: "Verify Document" },
      { id: "appeal.access", label: "Access Appeal Status" },
      { id: "appeal.review", label: "Review Appeal" },
      { id: "appeal.approve", label: "Approve Appeal" },
      { id: "appeal.reject", label: "Reject Appeal" },
    ]
  },

  {
    category: "Voter Management",
    minPlan: "STANDARD",
    permissions: [
      { id: "voter.view", label: "View Voters Page" },
      { id: "voter.import", label: "Import Voters" },
      { id: "voter.delete", label: "Delete Voter" },
    ]
  },
  {
    category: "Elections: Voting",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.voting.access", label: "Access Voting Phase" },
      { id: "election.voting.config.update", label: "Allow Update Voting Configuration" },
      { id: "election.voting.ballot.update", label: "Allow Update Ballot Display Configuration" },
    ]
  },
  {
    category: "Elections: Results",
    minPlan: "STANDARD",
    permissions: [
      { id: "election.results.access", label: "Access Results Phase" },
      { id: "election.results.config.update", label: "Allow Update Result Configuration" },
    ]
  }
];

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleName: string, permissions: string[], roleDescription: string) => void;
  isSaving: boolean;
  editingRole?: { id: string, roleName: string, permissions: string[], roleDescription?: string } | null;
  subscriptionPlan?: string | null;
}

export function AddRoleModal({ isOpen, onClose, onSave, isSaving, editingRole, subscriptionPlan }: AddRoleModalProps) {
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (editingRole) {
      setRoleName(editingRole.roleName);
      setRoleDescription(editingRole.roleDescription || "");
      setSelectedPermissions(editingRole.permissions || []);
    } else {
      setRoleName("");
      setRoleDescription("");
      setSelectedPermissions([]);
    }
  }, [editingRole, isOpen]);

  if (!isOpen) return null;

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const availableCategories = PERMISSION_CATEGORIES.filter(cat => {
    if (!subscriptionPlan) return true;
    if (subscriptionPlan === 'BASIC') return false;
    if (subscriptionPlan === 'STANDARD' && cat.minPlan === 'ENTERPRISE') return false;
    return true;
  });

  const toggleCategory = (categoryIndex: number) => {
    const categoryPerms = availableCategories[categoryIndex].permissions.map((p) => p.id);
    const allSelected = categoryPerms.every((pid) => selectedPermissions.includes(pid));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((pid) => !categoryPerms.includes(pid)));
    } else {
      setSelectedPermissions((prev) => {
        const set = new Set([...prev, ...categoryPerms]);
        return Array.from(set);
      });
    }
  };

  const handleSave = () => {
    onSave(roleName, selectedPermissions, roleDescription);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090215]/80 backdrop-blur-sm px-4">
      <div className="super-admin-sidebar w-full max-w-3xl max-h-[85vh] shrink-0 flex pl-8 flex-col !rounded-[28px] border py-6 md:py-8 pr-3 md:pr-4 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        <h2 className="mb-2 text-2xl font-bold relative z-10" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>{editingRole ? "Edit Role" : "Add New Role"}</h2>
        <p className="text-[13px] text-white/50 mb-6 relative z-10">{editingRole ? "Modify the permissions or name for this role." : "Configure custom permissions for this specific role variant."}</p>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-4 relative z-10">
          <div className="mb-5">
            <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Role Name</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Canvasser"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-3.5 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50"
            />
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-[13px] font-medium tracking-wide text-white/50 uppercase">Role Description</label>
            <textarea
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Briefly describe what this role is responsible for..."
              rows={3}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-3.5 text-[14px] text-white placeholder-white/20 outline-none transition-colors focus:border-[#5D44F8] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#5D44F8]/50 resize-none"
            />
          </div>

          <div className="mb-6">
            <h3 className="mb-4 text-[13px] font-medium tracking-wide text-white/50 uppercase">Role Permissions</h3>
            <div className="flex flex-col gap-6">
              {availableCategories.map((cat, index) => {
                const allCatSelected = cat.permissions.every(p => selectedPermissions.includes(p.id));
                const someCatSelected = cat.permissions.some(p => selectedPermissions.includes(p.id));

                return (
                  <div key={index} className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <h4 className="text-[15px] font-bold text-white/80">{cat.category}</h4>
                      <button
                        onClick={() => toggleCategory(index)}
                        className={`text-[12px] font-bold tracking-wide transition-colors ${allCatSelected ? "text-[#5db59b]" : someCatSelected ? "text-[#c28f64]" : "text-[#5D44F8] hover:text-[#D0C8FF]"
                          }`}
                      >
                        {allCatSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cat.permissions.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex h-5 w-5 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="peer h-5 w-5 appearance-none rounded-[6px] border border-white/20 bg-white/[0.02] transition-all checked:border-[#5D44F8] checked:bg-[#5D44F8] hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#5D44F8]/30"
                            />
                            <svg
                              className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <span className={`text-[13px] transition-colors ${selectedPermissions.includes(perm.id) ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 relative z-10 pt-4 border-t border-white/[0.05]">
          <button
            onClick={onClose}
            className="rounded-[14px] px-6 py-3 text-[14px] font-bold text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!roleName.trim() || selectedPermissions.length === 0 || isSaving}
            className={`rounded-[14px] px-7 py-3 text-[14px] font-bold text-white shadow-[0_4px_20px_rgb(79,53,205,0.4)] transition-all ${!roleName.trim() || selectedPermissions.length === 0 || isSaving
                ? "opacity-50 cursor-not-allowed bg-white/10"
                : "bg-[#4f35cd] hover:bg-[#5D44F8] hover:scale-[1.02] active:scale-[0.98]"
              }`}
          >
            {isSaving ? "Saving..." : (editingRole ? "Update Role" : "Save Role")}
          </button>
        </div>
      </div>
    </div>
  );
}
