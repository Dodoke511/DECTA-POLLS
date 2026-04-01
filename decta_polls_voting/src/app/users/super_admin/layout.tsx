"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <SuperAdminHeader />

      <div className="flex flex-1 overflow-hidden flex-col gap-4 p-4 md:flex-row md:p-6">
        <SuperAdminSidebar activePath={pathname} />

        <main className="min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar h-full" style={{
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(203,191,255,0.10)",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
