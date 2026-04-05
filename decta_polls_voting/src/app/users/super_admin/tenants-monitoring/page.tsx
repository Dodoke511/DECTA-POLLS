"use client";

import React, { useState, useEffect } from "react";
import { SuperAdminHeader } from "@/components/super_admin/Header";
import { SuperAdminSidebar } from "@/components/super_admin/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { TenantMonitoringStatusActions } from "@/components/super_admin/TenantActions";
import { type TenantRow } from "../Dashboard/page";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// --- Helper Functions ---
function isHttpUrl(value: string): boolean {
    return value.startsWith("http://") || value.startsWith("https://");
}

function getValueAsString(value: unknown, fallback: string): string {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    return fallback;
}

function sanitizeStoragePath(path: string): string {
    return path.replace(/^\/+/, "");
}

function extractTenantVerificationPath(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (isHttpUrl(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            const marker = "/tenant_verifications/";
            const markerIndex = parsed.pathname.indexOf(marker);
            if (markerIndex >= 0) {
                const filePart = parsed.pathname.slice(markerIndex + marker.length);
                return filePart ? decodeURIComponent(sanitizeStoragePath(filePart)) : null;
            }
            return null;
        } catch {
            return null;
        }
    }

    if (trimmed.startsWith("tenant_verifications/")) {
        return sanitizeStoragePath(trimmed.slice("tenant_verifications/".length));
    }

    return sanitizeStoragePath(trimmed);
}

function toFileName(path: string | null): string | null {
    if (!path) return null;
    const parts = path.split("/");
    return parts[parts.length - 1] ?? null;
}

import { useRouter } from "next/navigation";

export default function TenantsMonitoringPage() {
    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            const params = new URLSearchParams(window.location.search);
            const role = params.get('role');
            const random = params.get('random');
            const storedToken = sessionStorage.getItem('adminToken');

            if (role !== 'super_admin' || !random || random !== storedToken) {
                router.push('/auth/login_form');
                return;
            }

            try {
                // Fetch more tenants for monitoring page (e.g. 100)
                const response = await fetch("/api/get_tenants?limit=100");
                const json = await response.json();

                if (!response.ok) throw new Error(json.error || "Failed to fetch data");

                const fetchedTenants = await Promise.all(
                    json.data.map(async (record: Record<string, unknown>, index: number): Promise<TenantRow> => {
                        const verified = typeof record.is_verified === "boolean" ? record.is_verified : record.verified;
                        const verificationFromFlag = typeof verified === "boolean" ? (verified ? "Approved" : "Pending") : undefined;
                        const verificationValue = getValueAsString(record.verification ?? verificationFromFlag, "Pending");
                        const verificationPath = extractTenantVerificationPath(verificationValue);
                        const verificationFileName = toFileName(verificationPath);

                        let verificationUrl: string | null = null;
                        if (verificationPath) {
                            const { data } = await supabaseClient.storage.from("tenant_verifications").createSignedUrl(verificationPath, 60 * 60);
                            verificationUrl = data?.signedUrl ?? null;
                        }

                        return {
                            id: getValueAsString(record.id, `tenant-${index}`),
                            organization: getValueAsString(record.organization ?? record.organization_name, "Unknown Organization"),
                            email: getValueAsString(record.email, "No Email"),
                            type: getValueAsString(record.type, "N/A"),
                            isVerified: typeof verified === "boolean" ? verified : false,
                            verification: verificationValue,
                            verificationUrl,
                            verificationFileName,
                            subscription: getValueAsString(record.subscription, "Standard"),
                        };
                    })
                );

                setTenants(fetchedTenants);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
            <style dangerouslySetInnerHTML={{
                __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
            <SuperAdminHeader />

            <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 min-h-0">
                <SuperAdminSidebar activePath="/users/super_admin/tenants-monitoring" />

                <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none min-h-0">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{
                        color: "#D0C8FF",
                        textShadow: "2px 2px 20px rgba(208,200,255,0.45)",
                    }}>
                        Tenants Monitoring
                    </h1>
                    <div className="super-admin-table relative overflow-x-auto rounded-[22px]">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.10] text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                    <th className="px-5 py-4">Organization name</th>
                                    <th className="px-5 py-4">Email</th>
                                    <th className="px-5 py-4">Type</th>
                                    <th className="py-4 pl-5 pr-10 text-right md:pr-14">Subscription</th>
                                    <th className="py-4 pl-8 pr-5 text-center md:pl-10">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td className="px-5 py-6 text-white/60" colSpan={5}>Loading...</td></tr>
                                ) : tenants.map((row) => (
                                    <tr key={row.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4 font-medium text-white/85">{row.organization}</td>
                                        <td className="px-5 py-4 text-white/55">{row.email}</td>
                                        <td className="px-5 py-4 text-white/60">{row.type}</td>
                                        <td className="py-4 pl-5 pr-10 text-right align-middle md:pr-14">
                                            <span className="inline-flex rounded-full border border-[#5D44F8] bg-[#50C878]/[0.18] px-3 py-1 text-xs font-medium text-[#50C878]/[0.85]">
                                                {row.subscription}
                                            </span>
                                        </td>
                                        <td className="py-4 pl-8 pr-5 text-center align-middle md:pl-10">
                                            <TenantMonitoringStatusActions
                                                tenantId={row.id}
                                                tenantEmail={row.email}
                                                tenantOrganization={row.organization}
                                                verificationUrl={row.verificationUrl}
                                                isVerified={row.isVerified}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {(!loading && tenants.length === 0) && (
                                    <tr>
                                        <td className="px-5 py-6 text-white/60" colSpan={5}>
                                            {error ? `Error: ${error}` : "No tenants found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}