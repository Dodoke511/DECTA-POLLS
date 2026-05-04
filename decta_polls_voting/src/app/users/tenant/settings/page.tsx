"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { AccountSetting } from "@/components/tenant_admin/AccountSetting";
import { AccountManagement } from "@/components/tenant_admin/AccountManagement";
import { ViewAssignedRole } from "@/components/tenant_admin/ViewAssignedRole";
import { AssignUserModal } from "@/components/tenant_admin/AssignUserModal";
import { AddRoleModal } from "@/components/tenant_admin/AddRoleModal";
import PlanSubscription from "@/components/registration/PlanSubscription";
import DarkVeil from '@/components/mainlanding/ui/DarkVeil';

export default function TenantSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // States hoisted from AccountSetting
  const [tenantSlug, setTenantSlug] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandingColorPrimary, setBrandingColorPrimary] = useState("FFFFFF");
  const [brandingColorSecondary, setBrandingColorSecondary] = useState("FFFFFF");
  const [registrationMode, setRegistrationMode] = useState("HYBRID");
  const [activeTriggers, setActiveTriggers] = useState<string[]>([
    "Election Start",
    "Election End",
    "Candidate Added",
    "New Voter Registered",
    "Results Published",
    "Vote Cast",
  ]);
  const [allowSubstitution, setAllowSubstitution] = useState(false);
  const [allowWithdrawal, setAllowWithdrawal] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [tenantEmail, setTenantEmail] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isSubscriptionRenewed, setIsSubscriptionRenewed] = useState(false);

  const handleEditRole = (role: any) => {
    setEditingRole({
      id: role.id,
      roleName: role.roleName,
      permissions: role.permissions ?? [],
      roleDescription: role.roleDescription ?? "",
    });
    setIsAddRoleModalOpen(true);
  };

  // Assign Role States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigningUser, setIsAssigningUser] = useState(false);
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);

  const handleOpenAssignModal = (roleId: string) => {
    setAssigningRoleId(roleId);
    setIsAssignModalOpen(true);
  };

  const handleAssignUser = async (formData: any) => {
    if (!assigningRoleId || !tenantEmail) return;
    setIsAssigningUser(true);

    try {
      const response = await fetch("/api/invite_tenant_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          roleId: assigningRoleId,
          tenantEmail: tenantEmail
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send invitation");

      alert("Invitation sent successfully! The user will receive an email instructions to join.");
      setIsAssignModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error assigning user: ${err.message || "Please try again."}`);
    } finally {
      setIsAssigningUser(false);
    }
  };



  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');
    const email = sessionStorage.getItem('tenantEmail');

    if (role !== 'tenant' || !random || random !== storedToken || !email) {
      router.push('/auth/login_form');
      return;
    }

    setTenantEmail(email);
    setEditEmail(email);

    // Fetch initial settings
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/get_tenant_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const result = await response.json();

        if (response.ok && result.data) {
          const config = result.data;
          console.log("🔥 FETCHED CONFIG FROM DB:", config); // <-- Added for debugging

          if (config.slug) setTenantSlug(config.slug);
          if (config.organization) setOrganizationName(config.organization);
          if (config.logo_url) setLogoPreview(config.logo_url);
          if (config.main_color) setBrandingColorPrimary(config.main_color);
          if (config.secondary_color) setBrandingColorSecondary(config.secondary_color);
          if (config.registration_mode) setRegistrationMode(config.registration_mode);
          if (config.active_triggers) setActiveTriggers(config.active_triggers);
          if (config.allow_substitution !== undefined) setAllowSubstitution(config.allow_substitution);
          if (config.allow_withdrawal !== undefined) setAllowWithdrawal(config.allow_withdrawal);
          if (config.subscription) setSubscriptionPlan(config.subscription);
          if (config.subscription_expires_at) setExpirationDate(config.subscription_expires_at);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleSaveChanges = async () => {
    if (newPassword !== "" && newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    setIsSaving(true);
    try {
      let finalLogoUrl = logoPreview;

      // 1. If there is a new logo file, upload it
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("email", tenantEmail);

        const uploadRes = await fetch("/api/upload_tenant_logo", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.publicUrl) {
          finalLogoUrl = uploadData.publicUrl;
        } else {
          throw new Error(uploadData.error || "Failed to upload logo");
        }
      }

      // 2. Save settings to DB
      const payload = {
        email: tenantEmail,
        newEmail: editEmail !== tenantEmail ? editEmail : undefined,
        newPassword: newPassword !== "" ? newPassword : undefined,
        tenantSlug,
        organizationName,
        brandingColorPrimary,
        brandingColorSecondary,
        registrationMode,
        activeTriggers,
        allowSubstitution,
        allowWithdrawal,
        logoUrl: finalLogoUrl,
        subscriptionPlan,
        isSubscriptionRenewed,
      };

      const res = await fetch("/api/update_tenant_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save settings");

      if (editEmail !== tenantEmail) {
        setTenantEmail(editEmail);
        sessionStorage.setItem('tenantEmail', editEmail);
      }

      setNewPassword("");
      setConfirmPassword("");
      setIsSubscriptionRenewed(false);

      alert("Settings saved successfully!");
      setLogoFile(null); // Reset file after successful upload/save
    } catch (err: any) {
      console.error(err);
      alert(`Error saving settings: ${err.message || "Please try again."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const handleCreateRole = async (roleName: string, permissions: string[], roleDescription: string) => {
    if (!roleName.trim() || permissions.length === 0) return;
    setIsCreatingRole(true);

    try {
      if (editingRole) {
        // UPDATE Existing
        const payload = {
          roleId: editingRole.id,
          roleName: roleName,
          permissions: permissions,
          roleDescription: roleDescription,
        };

        const res = await fetch("/api/update_tenant_role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to update role");
        alert("Role updated successfully! Please refresh to see changes.");
      } else {
        // CREATE New
        const payload = {
          tenantEmail,
          roleName: roleName,
          permissions: permissions,
          roleDescription: roleDescription,
        };

        const res = await fetch("/api/create_tenant_role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to create role");
        alert("Role created successfully! Please refresh to see changes.");
      }

      setIsAddRoleModalOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving role: ${err.message || "Please try again."}`);
    } finally {
      setIsCreatingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative text-decta-text font-source-sans overflow-hidden selection:bg-decta-brand selection:text-white flex items-center justify-center">
        {/* Same DarkVeil Background as Landing Page */}
        <div className="fixed inset-0 -z-[100] pointer-events-none w-full h-full overflow-hidden">
          <DarkVeil
            hueShift={0}
            noiseIntensity={0}
            scanlineIntensity={0}
            speed={1.2}
            scanlineFrequency={0}
            warpAmount={0}
            resolutionScale={1}
          />
        </div>

        {/* Almost Full Screen Glassmorphism Container */}
        <div className="glass-card w-[95vw] h-[90vh] flex items-center justify-center mx-auto">
          <div className="loader font-montserrat font-bold text-white">
            Loading
            <div className="words">
              <span className="word">Settings</span>
              <span className="word">Account</span>
              <span className="word">Roles</span>
              <span className="word">Permissions</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/settings" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 flex flex-col rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-hidden md:rounded-l-none">
          <h1 className="mb-8 shrink-0 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Settings</h1>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-1">
                <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Account Settings</h2>
                <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px] bg-white/[0.02] p-6 shadow-sm ring-1 ring-white/[0.05] md:p-8">
                  <AccountSetting
                    tenantSlug={tenantSlug} setTenantSlug={setTenantSlug}
                    organizationName={organizationName} setOrganizationName={setOrganizationName}
                    logoPreview={logoPreview} setLogoPreview={setLogoPreview}
                    setLogoFile={setLogoFile}
                    brandingColorPrimary={brandingColorPrimary} setBrandingColorPrimary={setBrandingColorPrimary}
                    brandingColorSecondary={brandingColorSecondary} setBrandingColorSecondary={setBrandingColorSecondary}
                    registrationMode={registrationMode} setRegistrationMode={setRegistrationMode}
                    activeTriggers={activeTriggers} setActiveTriggers={setActiveTriggers}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Account Management</h2>
                <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px] bg-white/[0.02] p-6 shadow-sm ring-1 ring-white/[0.05] md:p-8">
                  <AccountManagement
                    email={editEmail}
                    setEmail={setEditEmail}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    subscriptionPlan={subscriptionPlan}
                    expirationDate={expirationDate}
                    onManageSubscription={() => setIsManagingSubscription(true)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>View Assigned Roles</h2>
                <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px] bg-white/[0.02] p-6 shadow-sm ring-1 ring-white/[0.05] md:p-8">
                  <ViewAssignedRole
                    onAssignClick={handleOpenAssignModal}
                    onEditClick={handleEditRole}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-5 mt-4 px-2 pb-10">
                <button
                  onClick={() => {
                    if (subscriptionPlan === 'BASIC') return;
                    setEditingRole(null);
                    setIsAddRoleModalOpen(true);
                  }}
                  disabled={subscriptionPlan === 'BASIC'}
                  title={subscriptionPlan === 'BASIC' ? "Custom roles are not available in the BASIC plan. Please upgrade to Standard or Enterprise." : ""}
                  className={`flex h-[52px] min-w-[180px] items-center justify-center rounded-[18px] px-10 text-[15px] font-bold tracking-wide text-white shadow-[0_8px_30px_rgb(79,53,205,0.3)] transition-all ${subscriptionPlan === 'BASIC'
                      ? "bg-white/10 opacity-40 cursor-not-allowed grayscale"
                      : "bg-[#4f35cd] hover:bg-[#5D44F8] hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {subscriptionPlan === 'BASIC' ? "Role Restricted" : "Add Role"}
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className={`flex h-[52px] min-w-[200px] items-center justify-center rounded-[18px] bg-[#4f35cd] px-10 text-[15px] font-bold tracking-wide text-white shadow-[0_8px_30px_rgb(79,53,205,0.3)] transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#5D44F8] hover:scale-[1.02] active:scale-[0.98]'}`}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AddRoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => {
          setIsAddRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSave={handleCreateRole}
        isSaving={isCreatingRole}
        editingRole={editingRole}
        subscriptionPlan={subscriptionPlan}
      />

      <AssignUserModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignUser}
        isSaving={isAssigningUser}
      />

      {isManagingSubscription && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black">
          <PlanSubscription
            onBack={() => setIsManagingSubscription(false)}
            onContinue={(plan) => {
              setSubscriptionPlan(plan);
              setIsSubscriptionRenewed(true);
              const d = new Date();
              d.setMonth(d.getMonth() + 1);
              setExpirationDate(d.toISOString());
              setIsManagingSubscription(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
