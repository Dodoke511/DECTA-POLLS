import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Upload, X, Palette, ImageIcon, Layout } from 'lucide-react';

export function BrandingSection({
  config,
  onUpdate,
  tenantBranding,
  defaultTitle,
  defaultWelcome
}: {
  config: any,
  onUpdate: (data: any) => void,
  tenantBranding: any,
  defaultTitle?: string,
  defaultWelcome?: string
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    { key: 'override_color', label: 'Primary Color', tenantKey: 'main_color' },
    { key: 'secondary_override_color', label: 'Secondary Color', tenantKey: 'secondary_color' },
    { key: 'third_override_color', label: 'Third Color', tenantKey: 'third_color' },
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `branding/${config?.election_id || 'temp'}/${Date.now()}_${file.name}`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const { url } = await res.json();
        onUpdate({ logo_url_override: url });
      }
    } catch (err) {
      console.error('Logo upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#140B2D]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-[#A78BFA]" />
          <h3 className="text-lg font-bold text-white">Section 1 — Branding & Site Identity</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">

          {/* Site Identity Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[#A78BFA] mb-4">
              <Layout className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">Site Content</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Public-facing Election Title</label>
                <input
                  type="text"
                  className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                  placeholder={defaultTitle || "e.g. 2026 Student Council Election"}
                  value={config?.public_title ?? defaultTitle ?? ''}
                  onChange={(e) => onUpdate({ public_title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Tagline</label>
                <input
                  type="text"
                  className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors"
                  placeholder="e.g. Your vote shapes our future."
                  value={config?.tagline || ''}
                  onChange={(e) => onUpdate({ tagline: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Welcome Message</label>
              <textarea
                className="w-full bg-[#090215] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A78BFA] transition-colors min-h-[100px]"
                placeholder={defaultWelcome || "Welcome message shown on election homepage"}
                value={config?.welcome_message ?? defaultWelcome ?? ''}
                onChange={(e) => onUpdate({ welcome_message: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5"
                  checked={config?.show_timeline ?? true}
                  onChange={(e) => onUpdate({ show_timeline: e.target.checked })}
                />
                <span className="text-white/60 text-sm">Show phase timeline</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox bg-[#090215] border-white/20 text-[#A78BFA] rounded focus:ring-0 focus:ring-offset-0 w-5 h-5"
                  checked={config?.show_active_phase ?? true}
                  onChange={(e) => onUpdate({ show_active_phase: e.target.checked })}
                />
                <span className="text-white/60 text-sm">Highlight active phase</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* Logo Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold text-sm">Organization Logo</h4>
                <p className="text-white/40 text-xs mt-1">This logo will appear in the navigation bar of the election portal.</p>
              </div>
              {config?.logo_url_override && (
                <button
                  onClick={() => onUpdate({ logo_url_override: null })}
                  className="text-red-400/60 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Reset to Default
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="relative group w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                {(config?.logo_url_override || tenantBranding?.logo_url) ? (
                  <img
                    src={config?.logo_url_override || tenantBranding?.logo_url}
                    alt="Logo Preview"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-white/10" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5D44F8] hover:bg-[#4a35cf] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Upload Custom Logo'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">
                  Recommended: 512x512px PNG or SVG
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* Color Management */}
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-bold text-sm">Color Palette</h4>
              <p className="text-white/40 text-xs mt-1">Override your organization's default colors for this specific election.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {colors.map((color) => {
                const isOverridden = !!config?.[color.key];
                const currentColor = config?.[color.key] || tenantBranding?.[color.tenantKey] || '#A78BFA';

                return (
                  <div key={color.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 text-[11px] font-black uppercase tracking-wider">{color.label}</span>
                      {isOverridden && (
                        <button
                          onClick={() => onUpdate({ [color.key]: null })}
                          className="text-white/20 hover:text-white/60 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <input
                          type="color"
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
                          value={currentColor}
                          onChange={(e) => onUpdate({ [color.key]: e.target.value })}
                        />
                        <div
                          className="absolute inset-0 rounded-lg pointer-events-none border border-white/10"
                          style={{ backgroundColor: currentColor }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-mono text-sm uppercase tracking-tighter">{currentColor}</span>
                        <span className="text-[10px] text-white/30">
                          {isOverridden ? 'Election Override' : 'Organization Default'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
