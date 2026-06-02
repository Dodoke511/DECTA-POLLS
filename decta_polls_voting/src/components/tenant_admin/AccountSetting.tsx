"use client";

import React, { useState } from "react";
import { RiImageAddLine } from "react-icons/ri";

export interface AccountSettingProps {
    tenantSlug: string;
    organizationName: string;
    logoPreview: string | null;
    brandingColorPrimary: string;
    brandingColorSecondary: string;
    brandingColorThird: string;
    activeTriggers: string[];
    setTenantSlug: React.Dispatch<React.SetStateAction<string>>;
    setOrganizationName: React.Dispatch<React.SetStateAction<string>>;
    setLogoPreview: React.Dispatch<React.SetStateAction<string | null>>;
    setLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
    setBrandingColorPrimary: React.Dispatch<React.SetStateAction<string>>;
    setBrandingColorSecondary: React.Dispatch<React.SetStateAction<string>>;
    setBrandingColorThird: React.Dispatch<React.SetStateAction<string>>;
    setActiveTriggers: React.Dispatch<React.SetStateAction<string[]>>;
    subscriptionPlan?: string | null;
    isLocked?: boolean;
}

export function AccountSetting({
    tenantSlug,
    organizationName,
    logoPreview,
    brandingColorPrimary,
    brandingColorSecondary,
    brandingColorThird,
    activeTriggers,
    setTenantSlug,
    setOrganizationName,
    setLogoPreview,
    setLogoFile,
    setBrandingColorPrimary,
    setBrandingColorSecondary,
    setBrandingColorThird,
    setActiveTriggers,
    subscriptionPlan,
    isLocked: isLockedProp = false,
}: AccountSettingProps) {
    const isBasic = subscriptionPlan === 'BASIC';
    const isLocked = isLockedProp || subscriptionPlan === 'EXPIRED' || subscriptionPlan === 'PENDING';
    const toggleTrigger = (trigger: string) => {
        if (isLocked) return;
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
                        className={`flex h-[150px] w-[150px] overflow-hidden ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} items-center justify-center rounded-full bg-[#82839b] shadow-inner text-white/80 transition-all ${isLocked ? '' : 'hover:bg-[#9293ad]'} border border-white/5`}
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
                        disabled={isLocked}
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
                                onChange={(e) => !isLocked && setOrganizationName(e.target.value)}
                                placeholder={isLocked ? "Locked while subscription is pending or expired" : "Enter organization name"}
                                disabled={isLocked}
                                className={`h-[42px] w-full rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50'}`}
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
                                onChange={(e) => !isLocked && setTenantSlug(e.target.value)}
                                placeholder={isLocked ? "Locked while subscription is pending or expired" : "Enter tenant slug"}
                                disabled={isLocked}
                                className={`h-[42px] w-full rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50'}`}
                            />
                        </div>
                    </div>

                    {/* Branding Color */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Branding Color
                            </label>
                            {isBasic && (
                                <span className="text-[9px] font-bold bg-white/10 text-white/50 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    Locked (Standard/Enterprise only)
                                </span>
                            )}
                            {isLocked && (
                                <span className="text-[9px] font-bold bg-amber-400/10 text-amber-100 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    Account Locked
                                </span>
                            )}
                        </div>
                        <div className={`flex flex-wrap gap-3 ${isBasic || isLocked ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}>
                            <div className={`group relative flex h-[42px] flex-1 min-w-[120px] max-w-[180px] ${isBasic || isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all ${isBasic || isLocked ? '' : 'hover:bg-white/[0.05] hover:border-white/30'} overflow-hidden`}>
                                <input
                                    type="color"
                                    disabled={isBasic || isLocked}
                                    value={brandingColorPrimary.startsWith('#') ? brandingColorPrimary : `#${brandingColorPrimary}`}
                                    onChange={(e) => !isBasic && !isLocked && setBrandingColorPrimary(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0"
                                />
                                <div
                                    className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                    style={{ backgroundColor: brandingColorPrimary.startsWith('#') ? brandingColorPrimary : `#${brandingColorPrimary}` }}
                                />
                                <span className="text-sm font-medium text-white/60 group-hover:text-white/80 uppercase">
                                    {brandingColorPrimary}
                                </span>
                            </div>
                            <div className={`group relative flex h-[42px] flex-1 min-w-[120px] max-w-[180px] ${isBasic || isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all ${isBasic || isLocked ? '' : 'hover:bg-white/[0.05] hover:border-white/30'} overflow-hidden`}>
                                <input
                                    type="color"
                                    disabled={isBasic || isLocked}
                                    value={brandingColorSecondary.startsWith('#') ? brandingColorSecondary : `#${brandingColorSecondary}`}
                                    onChange={(e) => !isBasic && !isLocked && setBrandingColorSecondary(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0"
                                />
                                <div
                                    className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                    style={{ backgroundColor: brandingColorSecondary.startsWith('#') ? brandingColorSecondary : `#${brandingColorSecondary}` }}
                                />
                                <span className="text-sm font-medium text-white/60 group-hover:text-white/80 uppercase">
                                    {brandingColorSecondary}
                                </span>
                            </div>
                            <div className={`group relative flex h-[42px] flex-1 min-w-[120px] max-w-[180px] ${isBasic || isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all ${isBasic || isLocked ? '' : 'hover:bg-white/[0.05] hover:border-white/30'} overflow-hidden`}>
                                <input
                                    type="color"
                                    disabled={isBasic || isLocked}
                                    value={brandingColorThird.startsWith('#') ? brandingColorThird : `#${brandingColorThird}`}
                                    onChange={(e) => !isBasic && !isLocked && setBrandingColorThird(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0"
                                />
                                <div
                                    className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                    style={{ backgroundColor: brandingColorThird.startsWith('#') ? brandingColorThird : `#${brandingColorThird}` }}
                                />
                                <span className="text-sm font-medium text-white/60 group-hover:text-white/80 uppercase">
                                    {brandingColorThird}
                                </span>
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
                                "Results Published",
                                "Vote Cast",
                            ].map((trigger) => (
                                <button
                                    key={trigger}
                                    onClick={() => toggleTrigger(trigger)}
                                    disabled={isLocked}
                                    className={`rounded-[14px] px-4 py-1.5 text-[13px] font-medium transition-all ${activeTriggers.includes(trigger)
                                        ? "bg-[#35256e] text-[#D0C8FF] border border-[#524199]"
                                        : "bg-transparent text-white/40 border border-white/[0.15] hover:bg-[#35256e]/50 hover:text-[#D0C8FF]/80 hover:border-[#524199]/50"
                                        } ${isLocked ? 'pointer-events-none opacity-50' : ''}`}
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
