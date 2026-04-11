"use client";

import React from "react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-white"
      style={{
        background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Glow orb */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20 pointer-events-none"
        style={{ backgroundColor: "#5D44F8" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-5xl mb-8 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          🔒
        </div>

        {/* Heading */}
        <h1
          className="text-4xl font-bold mb-3 tracking-tight"
          style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}
        >
          Access Restricted
        </h1>

        {/* Subtext */}
        <p className="text-white/50 text-base font-light leading-relaxed mb-10">
          You don&apos;t have the necessary permissions to view this page.
          Please contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => window.history.back()}
            className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white/70 font-semibold hover:bg-white/10 hover:text-white transition-all text-sm"
          >
            ← Go Back
          </button>
          <Link
            href="/auth/login_form"
            className="flex-1 py-3.5 rounded-xl bg-[#4f35cd] text-white font-semibold hover:bg-[#5D44F8] transition-all text-sm text-center shadow-[0_4px_20px_rgba(79,53,205,0.4)]"
          >
            Sign In as Different User
          </Link>
        </div>
      </div>
    </div>
  );
}
