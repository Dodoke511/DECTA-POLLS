"use client";

import React from "react";

export interface AccountManagementProps {
    email: string;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    newPassword?: string;
    setNewPassword?: React.Dispatch<React.SetStateAction<string>>;
    confirmPassword?: string;
    setConfirmPassword?: React.Dispatch<React.SetStateAction<string>>;
    subscriptionPlan: string | null;
    expirationDate: string | null;
    onManageSubscription?: () => void;
}

export function AccountManagement({
    email,
    setEmail,
    newPassword = "",
    setNewPassword = () => {},
    confirmPassword = "",
    setConfirmPassword = () => {},
    subscriptionPlan,
    expirationDate,
    onManageSubscription,
}: AccountManagementProps) {
    const formatExpirationDate = (dateString: string | null) => {
        if (!dateString) return "Loading...";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const expireDateFormatted = formatExpirationDate(expirationDate);
    return (
        <div className="w-full text-[#f1f0f3]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="mb-8 border-b border-white/[0.10] pb-4">
                <h2 className="text-base font-semibold tracking-wide text-white/90">
                    Account Management
                </h2>
            </div>

            <div className="flex flex-col gap-10">
                {/* Email Field */}
                <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all"
                    />
                </div>

                {/* New Password Field */}
                <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                        New Password
                    </label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all"
                    />
                </div>

                {/* Confirm New Password Field */}
                <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                        Confirm New Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50 transition-all"
                    />
                </div>

                {/* Subscription Plan */}
                <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                        Subscription Plan
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={subscriptionPlan ? `${subscriptionPlan} (Expires: ${expireDateFormatted})` : "Loading..."}
                            readOnly
                            className="h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none cursor-not-allowed uppercase"
                        />
                        <button 
                            type="button"
                            onClick={onManageSubscription}
                            className="h-[42px] rounded-[10px] bg-[#35256e] px-6 text-sm font-bold text-white transition-all hover:bg-[#5D44F8] hover:shadow-[0_4px_20px_rgb(93,68,248,0.3)]"
                        >
                            Manage Subscription
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
