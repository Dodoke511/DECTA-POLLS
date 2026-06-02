"use client";

import React from "react";
import { getDaysUntilExpiry, isSubscriptionExpiringSoon } from '@/lib/subscription-limits';

export interface AccountManagementProps {
    email: string;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    newPassword?: string;
    setNewPassword?: React.Dispatch<React.SetStateAction<string>>;
    confirmPassword?: string;
    setConfirmPassword?: React.Dispatch<React.SetStateAction<string>>;
    subscriptionPlan: string | null;
    expirationDate: string | null;
    isLocked?: boolean;
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
    isLocked = false,
    onManageSubscription,
}: AccountManagementProps) {
    const formatExpirationDate = (dateString: string | null) => {
        if (!dateString) return "Loading...";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const expireDateFormatted = formatExpirationDate(expirationDate);
    const daysUntilExpiry = getDaysUntilExpiry(expirationDate);
    const showExpiryAlert = isSubscriptionExpiringSoon(expirationDate, 10);

    return (
        <div className="w-full text-[#f1f0f3]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="mb-8 border-b border-white/[0.10] pb-4">
                <h2 className="text-base font-semibold tracking-wide text-white/90">
                    Account Management
                </h2>
            </div>

            <div className="flex flex-col gap-10">
                {showExpiryAlert && (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Your subscription expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'} on {expireDateFormatted}. Please renew now to avoid expiration.
                    </div>
                )}
                {/* Email Field */}
                <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D0C8FF]">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => !isLocked && setEmail(e.target.value)}
                        placeholder={isLocked ? "Locked while subscription is pending or expired" : undefined}
                        disabled={isLocked}
                        className={`h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50'}`}
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
                        placeholder={isLocked ? "Password changes are locked while subscription is pending/expired" : "Leave blank to keep unchanged"}
                        disabled={isLocked}
                        className={`h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50'}`}
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
                        placeholder={isLocked ? "Password changes are locked while subscription is pending/expired" : "Confirm new password"}
                        disabled={isLocked}
                        className={`h-[42px] w-full max-w-md rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm font-medium text-white/80 outline-none transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.05] focus:border-[#5D44F8] focus:ring-1 focus:ring-[#5D44F8]/50'}`}
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
