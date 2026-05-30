"use client";

import React, { useState, useEffect } from "react";
import NotificationBell from "../notifications/NotificationBell";
import { isSubscriptionExpiringSoon } from "@/lib/subscription-limits";

export function TenantAdminHeader() {
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [subscriptionDaysUntilExpiry, setSubscriptionDaysUntilExpiry] = useState<number | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  useEffect(() => {
    const tenantId = sessionStorage.getItem("tenantUserId");
    if (!tenantId) return;

    fetch(`/api/get_tenant_subscription?tenantId=${tenantId}`)
      .then((res) => res.json())
      .then((data) => {
        setSubscriptionExpiresAt(data.subscription_expires_at ?? null);
        setSubscriptionDaysUntilExpiry(data.days_until_expiry ?? null);
        setTenantStatus(data.status ?? null);
      })
      .catch((err) => console.error("Error fetching subscription in header:", err));
  }, []);

  const isPending = tenantStatus === "PENDING";
  const shouldShowExpiryBanner = isSubscriptionExpiringSoon(subscriptionExpiresAt, 10);

  return (
    <>
      <header className="relative z-50 flex items-center justify-between border-b border-white/[0.06] px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src="/decta-logo.png"
            alt="D.E.C.T.A Polls"
            className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0 rounded-full object-contain"
          />
          <span className="text-xs sm:text-sm font-medium tracking-wide text-white/95 truncate">
            <span className="hidden sm:inline">D.E.C.T.A Polls</span>
            <span className="sm:hidden">DECTA</span>
            <span className="text-white/45 mx-1">|</span>
            <span className="hidden md:inline">Tenant Admin</span>
            <span className="md:hidden">Tenant</span>
          </span>
        </div>
        <div className="flex items-center pr-2">
          <NotificationBell />
        </div>
      </header>

      {shouldShowExpiryBanner && !isPending && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              {/* ✅ Fixed: added flex items-center justify-center directly on the svg wrapper */}
              <svg className="w-5 h-5 text-amber-500 block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m2-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500">Subscription Renewal Reminder</p>
              <p className="text-xs text-amber-500/60">Your subscription expires in {subscriptionDaysUntilExpiry} day{subscriptionDaysUntilExpiry === 1 ? "" : "s"}. Renew now to avoid account restrictions.</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/40 px-3 py-1 rounded-lg border border-amber-500/10">Expiring Soon</p>
        </div>
      )}

      {isPending && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-500 block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
    </>
  );
}