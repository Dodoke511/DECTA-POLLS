"use client";

export default function GlobalConfiguration() {
  return (
    <div className="flex w-full flex-col gap-7 text-[#F1F0F3]">
      {/* Security Settings */}
      <section className="rounded-[22px] border border-white/[0.10] bg-white/[0.09] shadow-[5px_5px_10px_2px_rgba(255,255,255,0.06)] overflow-hidden">
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
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Session Timeout (minutes)</label>
                <input
                  type="text"
                  defaultValue="10 minutes"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
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
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data Retention & Backup */}
        <section className="rounded-[22px] border border-white/[0.10] bg-white/[0.09] shadow-[5px_5px_10px_2px_rgba(255,255,255,0.06)] overflow-hidden">
          <div className="p-8 md:p-9">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Data Retention & Backup</h2>
            <div className="mb-6 h-px bg-white/[0.10]" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Audit Log Retention (days)</label>
                <input
                  type="text"
                  defaultValue="365"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Election Data Retention (days)</label>
                <input
                  type="text"
                  defaultValue="730"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Backup Frequency</label>
                <input
                  type="text"
                  defaultValue="Daily"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Backup Retention (days)</label>
                <input
                  type="text"
                  defaultValue="90"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
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
        <section className="rounded-[22px] border border-white/[0.10] bg-white/[0.09] shadow-[5px_5px_10px_2px_rgba(255,255,255,0.06)] overflow-hidden">
          <div className="p-8 md:p-9">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white/90">Tenant Defaults</h2>
            <div className="mb-6 h-px bg-white/[0.10]" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Max User Per Tenant</label>
                <input
                  type="text"
                  defaultValue="12"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Max Elections</label>
                <input
                  type="text"
                  defaultValue="100"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Storage Limit (GB)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  className="w-full h-11 rounded-xl border border-white/[0.15] bg-white/[0.05] px-4 text-sm text-white/90 placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}
