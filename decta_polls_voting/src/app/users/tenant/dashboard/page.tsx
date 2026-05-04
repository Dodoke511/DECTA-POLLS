"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const random = params.get('random');
    const status = params.get('status') || sessionStorage.getItem('tenantStatus');
    const storedToken = sessionStorage.getItem('tenantToken');
    const storedSupabaseToken = sessionStorage.getItem('supabaseToken');

    if (!random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    setTenantStatus(status);
    setLoading(false);
  }, [router]);

  const isPending = tenantStatus === 'PENDING';

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

      {isPending && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500">Account Verification Required</p>
              <p className="text-xs text-amber-500/60">Your tenant account is currently PENDING. Most features are disabled until a super-admin approves your registration.</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/40 px-3 py-1 rounded-lg border border-amber-500/10">Read Only Mode</p>
        </div>
      )}

      <div className={`flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden ${isPending ? 'grayscale-[0.5]' : ''}`}>
        <TenantAdminSidebar activePath="/users/tenant/dashboard" isRestricted={isPending} />

        <main className={`super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none ${isPending ? 'pointer-events-none opacity-60' : ''}`}>
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Dashboard</h1>

          <div className="grid gap-6">
            <p className="text-white/60">Dashboard content coming soon...</p>
          </div>
        </main>
      </div>
    </div>
  );
}
