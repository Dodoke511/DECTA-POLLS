"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";

export function GlobalConfiguration() {
  return (
    <div className="flex w-full flex-col gap-7 text-[#F1F0F3]">
      {/* Security Settings */}
      <section className="super-admin-card rounded-[22px] border border-white/[0.10] overflow-hidden">
          <div className="p-8 md:p-9">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Security Settings</h2>
            <div className="mb-6 h-px bg-white/[0.10]" />

            {/* Form Content */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Minimum Password Length</label>
                <input
                  type="text"
                  defaultValue="12"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Session Timeout (minutes)</label>
                <input
                  type="text"
                  defaultValue="10 minutes"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="h-5 w-5 cursor-pointer rounded border-white/[0.2] bg-white/[0.05] accent-[#6B3FF5]" />
                <label className="text-sm font-semibold text-white/70">Enable Password Expiry</label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Max Login Attempts</label>
                <input
                  type="text"
                  defaultValue="5"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data Retention & Backup */}
        <section className="super-admin-card rounded-[22px] border border-white/[0.10] overflow-hidden">
          <div className="p-8 md:p-9">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Data Retention & Backup</h2>
            <div className="mb-6 h-px bg-white/[0.10]" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Audit Log Retention (days)</label>
                <input
                  type="text"
                  defaultValue="365"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Election Data Retention (days)</label>
                <input
                  type="text"
                  defaultValue="730"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Backup Frequency</label>
                <input
                  type="text"
                  defaultValue="Daily"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Backup Retention (days)</label>
                <input
                  type="text"
                  defaultValue="90"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="h-5 w-5 cursor-pointer rounded border-white/[0.2] bg-white/[0.05] accent-[#6B3FF5]" />
                <label className="text-sm font-semibold text-white/70">Enable Automatic Backups</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="h-5 w-5 cursor-pointer rounded border-white/[0.2] bg-white/[0.05] accent-[#6B3FF5]" />
                <label className="text-sm font-semibold text-white/70">Encrypt Backups</label>
              </div>
            </div>
          </div>
        </section>

        {/* Tenant Defaults */}
        <section className="super-admin-card rounded-[22px] border border-white/[0.10] overflow-hidden">
          <div className="p-8 md:p-9">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Tenant Defaults</h2>
            <div className="mb-6 h-px bg-white/[0.10]" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Max User Per Tenant</label>
                <input
                  type="text"
                  defaultValue="12"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Max Elections</label>
                <input
                  type="text"
                  defaultValue="100"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Storage Limit (GB)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                  style={{ color: '#f1f0f3' }}
                />
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}

export default function SystemConfigurationPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('adminToken');

    if (role !== 'super_admin' || !random || random !== storedToken) {
      router.push('/auth/login_form');
    }
  }, [router]);

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <SuperAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 min-h-0">
        <SuperAdminSidebar activePath="/users/super_admin/system-configuration" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none min-h-0">
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{
            color: "#D0C8FF",
            textShadow: "2px 2px 208,200,255,0.45)",
          }}>
            Settings
          </h1>
          <GlobalConfiguration />
        </main>
      </div>
    </div>
  );
}
