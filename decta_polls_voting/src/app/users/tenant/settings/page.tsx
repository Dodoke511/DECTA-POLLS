"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { AccountSetting } from "@/components/tenant_admin/AccountSetting";
import { ViewAssignedRole } from "@/components/tenant_admin/ViewAssignedRole";

export default function TenantSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
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
                  <AccountSetting />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="mb-5 text-xl font-bold md:text-2xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>View Assigned Roles</h2>
                <div className="super-admin-table relative w-full overflow-x-auto rounded-[22px] bg-white/[0.02] p-6 shadow-sm ring-1 ring-white/[0.05] md:p-8">
                  <ViewAssignedRole />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
