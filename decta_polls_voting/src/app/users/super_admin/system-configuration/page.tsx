"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";

export function GlobalConfiguration() {
  const [settings, setSettings] = React.useState<any>({
    security: {
      session_timeout: "60",
      min_password_length: "12",
      max_password_length: "64",
      allowed_special_chars: "!@#$%^&*()",
      max_login_attempts: "5",
      lockout_seconds: "30",
      enable_password_expiry: true
    },
    retention: {
      audit_log_days: "365",
      election_data_days: "730",
      backup_frequency: "Daily",
      backup_retention_days: "90",
      auto_backup: true,
      encrypt_backups: true
    },
    tenant_defaults: {
      max_users: "12",
      max_elections: "100",
      storage_limit_gb: "5"
    }
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState({ text: '', type: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/super_admin/settings');
        if (res.ok) {
          const { settings: fetched } = await res.json();
          if (fetched && Object.keys(fetched).length > 0) {
            setSettings((prev: any) => {
              const next = { ...prev };
              // Properly merge nested categories to avoid losing default keys
              Object.keys(fetched).forEach(cat => {
                if (typeof fetched[cat] === 'object' && fetched[cat] !== null && prev[cat]) {
                  next[cat] = { ...prev[cat], ...fetched[cat] };
                } else {
                  next[cat] = fetched[cat];
                }
              });
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/super_admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setMessage({ text: 'Error saving settings.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateNested = (category: string, key: string, val: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: { ...prev[category], [key]: val }
    }));
  };

  return (
    <div className="flex w-full flex-col gap-7 text-[#F1F0F3]">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-[#6B3FF5] hover:bg-[#5833cc] text-white font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          {message.text}
        </div>
      )}

      {/* Security Settings */}
      <section className="super-admin-card rounded-[22px] border border-white/[0.10] overflow-hidden">
        <div className="p-8 md:p-9">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Security Settings</h2>
          <div className="mb-6 h-px bg-white/[0.10]" />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Minimum Password Length</label>
              <input
                type="text"
                value={settings.security?.min_password_length || ""}
                onChange={e => updateNested('security', 'min_password_length', e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                style={{ color: '#f1f0f3' }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Maximum Password Length</label>
              <input
                type="text"
                value={settings.security?.max_password_length || ""}
                onChange={e => updateNested('security', 'max_password_length', e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                style={{ color: '#f1f0f3' }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Allowed Special Characters</label>
              <input
                type="text"
                value={settings.security?.allowed_special_chars || ""}
                onChange={e => updateNested('security', 'allowed_special_chars', e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                style={{ color: '#f1f0f3' }}
                placeholder="!@#$%^&*()"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Login Cooldown (seconds)</label>
              <input
                type="text"
                value={settings.security?.lockout_seconds || ""}
                onChange={e => updateNested('security', 'lockout_seconds', e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                style={{ color: '#f1f0f3' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!settings.security?.enable_password_expiry}
                onChange={e => updateNested('security', 'enable_password_expiry', e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-white/[0.2] bg-white/[0.05] accent-[#6B3FF5]"
              />
              <label className="text-sm font-semibold text-white/70">Enable Password Expiry</label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Max Login Attempts</label>
              <input
                type="text"
                value={settings.security?.max_login_attempts || ""}
                onChange={e => updateNested('security', 'max_login_attempts', e.target.value)}
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
                value={settings.retention?.audit_log_days || ""}
                onChange={e => updateNested('retention', 'audit_log_days', e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                style={{ color: '#f1f0f3' }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Election Data Retention (days)</label>
              <input
                type="text"
                value={settings.retention?.election_data_days || ""}
                onChange={e => updateNested('retention', 'election_data_days', e.target.value)}
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
