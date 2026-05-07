"use client";

import React, { useState } from "react";
import { RiImageAddLine } from "react-icons/ri";

export interface AccountSettingProps {
    tenantSlug: string;
    organizationName: string;
    logoPreview: string | null;
    brandingColorPrimary: string;
    brandingColorSecondary: string;
    activeTriggers: string[];
    setTenantSlug: React.Dispatch<React.SetStateAction<string>>;
    setOrganizationName: React.Dispatch<React.SetStateAction<string>>;
    setLogoPreview: React.Dispatch<React.SetStateAction<string | null>>;
    setLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
    setBrandingColorPrimary: React.Dispatch<React.SetStateAction<string>>;
    setBrandingColorSecondary: React.Dispatch<React.SetStateAction<string>>;
    setActiveTriggers: React.Dispatch<React.SetStateAction<string[]>>;
}

export function AccountSetting({
    tenantSlug,
    organizationName,
    logoPreview,
    brandingColorPrimary,
    brandingColorSecondary,
    activeTriggers,
    setTenantSlug,
    setOrganizationName,
    setLogoPreview,
    setLogoFile,
    setBrandingColorPrimary,
    setBrandingColorSecondary,
    setActiveTriggers
}: AccountSettingProps) {
    const toggleTrigger = (trigger: string) => {
        if (activeTriggers.includes(trigger)) {
            setActiveTriggers(activeTriggers.filter((t) => t !== trigger));
        } else {
            setActiveTriggers([...activeTriggers, trigger]);
        }
    };

    const [imgError, setImgError] = React.useState(false);

    // Reset error state when logoPreview changes (e.g. from a new upload)
    React.useEffect(() => {
        setImgError(false);
    }, [logoPreview]);

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLogoFile(file); // Save file object for uploading

        const reader = new FileReader();
        reader.onload = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="w-full text-[#f1f0f3]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="mb-8 border-b border-white/[0.10] pb-4">
                <h2 className="text-base font-semibold tracking-wide text-white/90">
                    Global Configurations
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-[200px_1fr] md:gap-14 items-start">
                {/* Organization Logo (Left Column) */}
                <div className="flex flex-col items-center justify-center">
                    <label
                        htmlFor="logo-upload"
                        className="flex h-[150px] w-[150px] overflow-hidden cursor-pointer items-center justify-center rounded-full bg-[#82839b] shadow-inner text-white/80 transition-all hover:bg-[#9293ad] border border-white/5"
                    >
                        {logoPreview && !imgError ? (
                            <img
                                src={logoPreview}
                                alt="Logo"
                                onError={() => setImgError(true)}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <RiImageAddLine style={{ fontSize: "64px" }} />
                        )}
                    </label>
                    <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                    />
                    <p className="mt-5 text-[15px] font-medium tracking-wide text-white/80 text-center">
                        Change Your Logo
                    </p>
                </div>
                <div className="flex flex-col gap-10">
                    {/* Top Row: Organization & Tenant Slug */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                        {/* Organization */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Organization
                            </label>
                            <input
                                type="text"
                                value={organizationName}
                                onChange={(e) => setOrganizationName(e.target.value)}
                                placeholder="Enter organization name"
                                className="h-[42px] w-full rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50"
                            />
                        </div>

                        {/* Tenant Slug */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Tenant Slug
                            </label>
                            <input
                                type="text"
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value)}
                                placeholder="Enter tenant slug"
                                className="h-[42px] w-full rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50"
                            />
                        </div>
                    </div>

                    {/* Branding Color & Voter Registration Mode */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                        {/* Branding Color */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Branding Color
                            </label>
                            <div className="flex gap-3">
                                <div className="group relative flex h-[42px] flex-1 cursor-pointer items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all hover:bg-white/[0.05] hover:border-white/30 overflow-hidden">
                                    <input
                                        type="color"
                                        value={brandingColorPrimary.startsWith('#') ? brandingColorPrimary : `#${brandingColorPrimary}`}
                                        onChange={(e) => setBrandingColorPrimary(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div
                                        className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                        style={{ backgroundColor: brandingColorPrimary.startsWith('#') ? brandingColorPrimary : `#${brandingColorPrimary}` }}
                                    />
                                    <span className="text-sm font-medium text-white/60 group-hover:text-white/80 uppercase">
                                        {brandingColorPrimary}
                                    </span>
                                </div>
                                <div className="group relative flex h-[42px] flex-1 cursor-pointer items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all hover:bg-white/[0.05] hover:border-white/30 overflow-hidden">
                                    <input
                                        type="color"
                                        value={brandingColorSecondary.startsWith('#') ? brandingColorSecondary : `#${brandingColorSecondary}`}
                                        onChange={(e) => setBrandingColorSecondary(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div
                                        className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                        style={{ backgroundColor: brandingColorSecondary.startsWith('#') ? brandingColorSecondary : `#${brandingColorSecondary}` }}
                                    />
                                    <span className="text-sm font-medium text-white/60 group-hover:text-white/80 uppercase">
                                        {brandingColorSecondary}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Triggers */}
                    <div className="flex flex-col gap-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                            Notification Triggers
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                            {[
                                "Election Start",
                                "Election End",
                                "Candidate Added",
                                "New Voter Registered",
                                "Results Published",
                                "Vote Cast",
                            ].map((trigger) => (
                                <button
                                    key={trigger}
                                    onClick={() => toggleTrigger(trigger)}
                                    className={`rounded-[14px] px-4 py-1.5 text-[13px] font-medium transition-all ${activeTriggers.includes(trigger)
                                        ? "bg-[#35256e] text-[#D0C8FF] border border-[#524199]"
                                        : "bg-transparent text-white/40 border border-white/[0.15] hover:bg-[#35256e]/50 hover:text-[#D0C8FF]/80 hover:border-[#524199]/50"
                                        }`}
                                >
                                    {trigger}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
