"use client";

import React, { useState, useEffect } from "react";

export function ViewAssignedRole({ onAssignClick, onEditClick }: { onAssignClick?: (roleId: string) => void; onEditClick?: (role: any) => void }) {
    const [assignedRoles, setAssignedRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            const email = sessionStorage.getItem('tenantEmail');
            if (!email) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/get_tenant_roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const result = await res.json();
                if (res.ok && result.data) {
                    setAssignedRoles(result.data);
                }
            } catch (err) {
                console.error("Error fetching roles:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, []);

    return (
        <div className="overflow-x-auto w-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                    <tr className="border-b border-white/[0.05]">
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            ROLE
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            ASSIGNED PERSON
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            PERMISSIONS
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            STATUS
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            ASSIGN
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-[13px] text-white/40">
                                Loading roles...
                            </td>
                        </tr>
                    ) : assignedRoles.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-[13px] text-white/40">
                                No custom roles created yet.
                            </td>
                        </tr>
                    ) : assignedRoles.map((row, index) => (
                        <tr
                            key={row.id}
                            className={
                                index !== assignedRoles.length - 1
                                    ? "border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors"
                                    : "hover:bg-white/[0.01] transition-colors"
                            }
                        >
                            <td className="py-4 text-[13px] font-medium text-white/70 md:pr-8">
                                {row.roleName}
                            </td>
                            <td className="py-4 text-[13px] text-white/70 md:pr-8">
                                {row.assignedEmail ?? ""}
                            </td>
                            <td className="py-4 md:pr-8">
                                <button
                                    onClick={() => onEditClick?.(row)}
                                    title="Edit Role Permissions"
                                    className="inline-flex items-center rounded-full border px-3.5 py-1 text-[11px] font-medium tracking-wide border-[#6c5b96] bg-[#3a2e5d]/60 text-[#a39ec8] hover:bg-[#4f35cd]/40 hover:text-white hover:border-[#4f35cd]/60 transition-all cursor-pointer"
                                >
                                    {row.permissions ? `${row.permissions.length} Permissions` : "Custom"}
                                </button>
                            </td>
                            <td className="py-4 md:pr-8">
                                <span
                                    className={`inline-flex items-center rounded-full border px-3.5 py-1 text-[11px] font-medium tracking-wide ${row.assignedEmail
                                            ? "border-[#387a66] bg-[#22483d]/60 text-[#5db59b]"
                                            : "border-[#8b5e34] bg-[#4a321f]/60 text-[#c28f64]"
                                        }`}
                                >
                                    {row.assignedEmail ? "Assigned" : "Not Assigned"}
                                </span>
                            </td>
                            <td className="py-4 md:pr-8">
                                <button
                                    onClick={() => onAssignClick?.(row.id)}
                                    className="rounded-lg bg-[#4f35cd]/20 px-4 py-1.5 text-[12px] font-bold text-[#D0C8FF] border border-[#4f35cd]/50 hover:bg-[#4f35cd]/40 transition-colors"
                                >
                                    Assign
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
