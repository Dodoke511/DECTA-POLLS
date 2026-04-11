"use client";

import React, { useState, useEffect } from "react";

export const PERMISSION_CATEGORIES = [
  {
    category: "System & Tenant Management",
    permissions: [
      { id: "tenant.manage", label: "Manage Tenant" },
      { id: "tenant.settings.update", label: "Update Settings" },
      { id: "user.invite", label: "Invite Users" },
      { id: "user.remove", label: "Remove Users" },
      { id: "user.update", label: "Update Users" },
      { id: "role.create", label: "Create Roles" },
      { id: "role.update", label: "Update Roles" },
      { id: "role.delete", label: "Delete Roles" },
      { id: "role.assign", label: "Assign Roles" },
    ]
  },
  {
    category: "Election Management",
    permissions: [
      { id: "election.create", label: "Create Election" },
      { id: "election.update", label: "Update Election" },
      { id: "election.delete", label: "Delete Election" },
      { id: "election.view", label: "View Election" },
      { id: "election.activate", label: "Activate Election" },
      { id: "election.archive", label: "Archive Election" },
    ]
  },
  {
    category: "Ballot Designer",
    permissions: [
      { id: "ballot.create", label: "Create Ballot" },
      { id: "ballot.update", label: "Update Ballot" },
      { id: "position.create", label: "Create Position" },
      { id: "position.update", label: "Update Position" },
      { id: "position.delete", label: "Delete Position" },
      { id: "position.reorder", label: "Reorder Position" },
    ]
  },
  {
    category: "Candidate Management",
    permissions: [
      { id: "candidate.apply", label: "Apply as Candidate" },
      { id: "candidate.edit_own", label: "Edit Own Candidacy" },
      { id: "candidate.withdraw", label: "Withdraw Candidacy" },
      { id: "candidate.view", label: "View Candidates" },
      { id: "candidate.review", label: "Review Candidates" },
      { id: "candidate.approve", label: "Approve Candidates" },
      { id: "candidate.reject", label: "Reject Candidates" },
      { id: "candidate.override", label: "Override Candidate Rules" },
      { id: "document.upload", label: "Upload Document" },
      { id: "document.view", label: "View Document" },
      { id: "document.verify", label: "Verify Document" },
      { id: "document.reject", label: "Reject Document" },
    ]
  },
  {
    category: "Rules, Workflow & Approval",
    permissions: [
      { id: "rules.create", label: "Create Rules" },
      { id: "rules.update", label: "Update Rules" },
      { id: "rules.delete", label: "Delete Rules" },
      { id: "rules.view", label: "View Rules" },
      { id: "rules.apply", label: "Apply Rules" },
      { id: "rules.override", label: "Override Rules" },
      { id: "phase.create", label: "Create Phase" },
      { id: "phase.update", label: "Update Phase" },
      { id: "phase.delete", label: "Delete Phase" },
      { id: "phase.activate", label: "Activate Phase" },
      { id: "phase.close", label: "Close Phase" },
      { id: "phase.override", label: "Override Phase" },
      { id: "approval.request", label: "Request Approval" },
      { id: "approval.review", label: "Review Approval" },
      { id: "approval.approve", label: "Approve Approval" },
      { id: "approval.reject", label: "Reject Approval" },
      { id: "approval.override", label: "Override Approval" },
      { id: "appeal.submit", label: "Submit Appeal" },
      { id: "appeal.view_own", label: "View Own Appeal" },
      { id: "appeal.review", label: "Review Appeal" },
      { id: "appeal.approve", label: "Approve Appeal" },
      { id: "appeal.reject", label: "Reject Appeal" },
      { id: "appeal.resolve", label: "Resolve Appeal" },
    ]
  },
  {
    category: "Voter Management",
    permissions: [
      { id: "voter.register_self", label: "Register Self" },
      { id: "voter.import", label: "Import Voters" },
      { id: "voter.approve", label: "Approve Voter" },
      { id: "voter.reject", label: "Reject Voter" },
      { id: "voter.remove", label: "Remove Voter" },
      { id: "voter.assign_token", label: "Assign Token" },
    ]
  },
  {
    category: "Results, Audit & Security",
    permissions: [
      { id: "result.compute", label: "Compute Results" },
      { id: "result.view", label: "View Results" },
      { id: "result.export", label: "Export Results" },
      { id: "result.publish", label: "Publish Results" },
      { id: "result.lock", label: "Lock Results" },
      { id: "audit.view", label: "View Audit Logs" },
      { id: "audit.export", label: "Export Audit Logs" },
      { id: "access.override", label: "Override Access" },
      { id: "permission.assign", label: "Assign Permissions" },
      { id: "permission.view", label: "View Permissions" },
    ]
  }
];

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleName: string, permissions: string[], roleDescription: string) => void;
  isSaving: boolean;
  editingRole?: { id: string, roleName: string, permissions: string[], roleDescription?: string } | null;
}

export function AddRoleModal({ isOpen, onClose, onSave, isSaving, editingRole }: AddRoleModalProps) {
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

  const toggleCategory = (categoryIndex: number) => {
    const categoryPerms = PERMISSION_CATEGORIES[categoryIndex].permissions.map((p) => p.id);
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
              {PERMISSION_CATEGORIES.map((cat, index) => {
                const allCatSelected = cat.permissions.every(p => selectedPermissions.includes(p.id));
                const someCatSelected = cat.permissions.some(p => selectedPermissions.includes(p.id));

                return (
                  <div key={index} className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <h4 className="text-[15px] font-bold text-white/80">{cat.category}</h4>
                      <button
                        onClick={() => toggleCategory(index)}
                        className={`text-[12px] font-bold tracking-wide transition-colors ${
                          allCatSelected ? "text-[#5db59b]" : someCatSelected ? "text-[#c28f64]" : "text-[#5D44F8] hover:text-[#D0C8FF]"
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
            className={`rounded-[14px] px-7 py-3 text-[14px] font-bold text-white shadow-[0_4px_20px_rgb(79,53,205,0.4)] transition-all ${
              !roleName.trim() || selectedPermissions.length === 0 || isSaving
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
