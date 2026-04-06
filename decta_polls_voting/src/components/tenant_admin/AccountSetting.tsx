"use client";

import React, { useState } from "react";
import { RiImageAddLine } from "react-icons/ri";

export function AccountSetting() {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [brandingColorPrimary, setBrandingColorPrimary] = useState("FFFFFF");
    const [brandingColorSecondary, setBrandingColorSecondary] = useState("FFFFFF");
    const [registrationMode, setRegistrationMode] = useState("HYBRID");
    const [activeTriggers, setActiveTriggers] = useState([
        "Election Start",
        "Election End",
        "Candidate Added",
        "New Voter Registered",
        "Results Published",
        "Vote Cast",
    ]);
    const [allowSubstitution, setAllowSubstitution] = useState(false);
    const [allowWithdrawal, setAllowWithdrawal] = useState(false);

    const toggleTrigger = (trigger: string) => {
        if (activeTriggers.includes(trigger)) {
            setActiveTriggers(activeTriggers.filter((t) => t !== trigger));
        } else {
            setActiveTriggers([...activeTriggers, trigger]);
        }
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
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
                        className="flex h-[150px] w-[150px] cursor-pointer items-center justify-center rounded-full bg-[#82839b] shadow-inner text-white/80 transition-all hover:bg-[#9293ad] border border-white/5"
                    >
                        {logoPreview ? (
                            <img
                                src={logoPreview}
                                alt="Organization Logo"
                                className="h-full w-full rounded-full object-cover"
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
                        Upload Your Logo
                    </p>
                </div>

                {/* Form Fields (Right Column) */}
                <div className="flex flex-col gap-10">
                    {/* Top Row: Branding Color & Voter Registration Mode */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                        {/* Branding Color */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Branding Color
                            </label>
                            <div className="flex gap-3">
                                <div className="group flex h-[42px] flex-1 cursor-pointer items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all hover:bg-white/[0.05] hover:border-white/30">
                                    <div
                                        className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                        style={{ backgroundColor: `#${brandingColorPrimary}` }}
                                    />
                                    <span className="text-sm font-medium text-white/60 group-hover:text-white/80">
                                        {brandingColorPrimary}
                                    </span>
                                </div>
                                <div className="group flex h-[42px] flex-1 cursor-pointer items-center gap-3 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3.5 transition-all hover:bg-white/[0.05] hover:border-white/30">
                                    <div
                                        className="h-[18px] w-[18px] rounded-[4px] border border-white/20 shadow-sm"
                                        style={{ backgroundColor: `#${brandingColorSecondary}` }}
                                    />
                                    <span className="text-sm font-medium text-white/60 group-hover:text-white/80">
                                        {brandingColorSecondary}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Voter Registration Mode */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                                Voter Registration Mode
                            </label>
                            <div className="relative">
                                <select
                                    value={registrationMode}
                                    onChange={(e) => setRegistrationMode(e.target.value)}
                                    className="h-[42px] w-full appearance-none rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 pr-10 text-sm font-medium text-white/60 outline-none transition-all hover:bg-white/[0.05] hover:text-white/80 focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 cursor-pointer"
                                >
                                    <option value="HYBRID" className="bg-[#180d42] text-white/80">HYBRID</option>
                                    <option value="ONLINE" className="bg-[#180d42] text-white/80">ONLINE</option>
                                    <option value="OFFLINE" className="bg-[#180d42] text-white/80">OFFLINE</option>
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                                    <svg
                                        width="10"
                                        height="6"
                                        viewBox="0 0 10 6"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M1 1L5 5L9 1"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
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

                    {/* Setting Toggles */}
                    <div className="mt-1 flex flex-col gap-7">
                        {/* Toggle 1 */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-[#D0C8FF]">
                                    Allow Candidate Substitution
                                </span>
                                <span className="text-xs text-white/45">
                                    Permit replacing a candidate with another during pre-election phase
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAllowSubstitution(!allowSubstitution)}
                                className={`relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5D44F8] focus:ring-offset-2 focus:ring-offset-[#090215] ${allowSubstitution ? "bg-[#5D44F8]" : "bg-white/20"
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowSubstitution ? "translate-x-4" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Toggle 2 */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-[#D0C8FF]">
                                    Allow Candidate Withdrawal
                                </span>
                                <span className="text-xs text-white/45">
                                    Allow candidates to withdraw from the election before voting begins
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAllowWithdrawal(!allowWithdrawal)}
                                className={`relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5D44F8] focus:ring-offset-2 focus:ring-offset-[#090215] ${allowWithdrawal ? "bg-[#5D44F8]" : "bg-white/20"
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowWithdrawal ? "translate-x-4" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
