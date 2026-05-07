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

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch("/api/delete_tenant_role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roleId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to delete role");
            setAssignedRoles((prev) => prev.filter((r) => r.id !== roleId));
            alert("Role deleted successfully.");
        } catch (err: any) {
            console.error(err);
            alert(`Error deleting role: ${err.message}`);
        }
    };

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
                            ACTIONS
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
                                <AssignedPersonCell
                                    roleId={row.id}
                                    assignedEmail={row.assignedEmail}
                                    onRemoved={() => {
                                        setAssignedRoles(prev =>
                                            prev.map(r => r.id === row.id ? { ...r, assignedEmail: null } : r)
                                        );
                                    }}
                                />
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
                            <td className="py-4 md:pr-8 flex items-center gap-6">
                                <button
                                    onClick={() => onAssignClick?.(row.id)}
                                    className="rounded-lg bg-[#4f35cd]/20 px-4 py-1.5 text-[12px] font-bold text-[#D0C8FF] border border-[#4f35cd]/50 hover:bg-[#4f35cd]/40 transition-colors"
                                >
                                    Assign
                                </button>
                                <button
                                    onClick={() => handleDeleteRole(row.id, row.roleName)}
                                    className="rounded-lg bg-red-500/10 px-4 py-1.5 text-[12px] font-bold text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                    title="Delete Role"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AssignedPersonCell({
    roleId,
    assignedEmail,
    onRemoved,
}: {
    roleId: string;
    assignedEmail: string | null;
    onRemoved: () => void;
}) {
    const [requesting, setRequesting] = useState(false);
    const [requested, setRequested] = useState(false);

    if (!assignedEmail) {
        return null;
    }

    const handleRequestRemoval = async () => {
        setRequesting(true);
        try {
            const tenantEmail = sessionStorage.getItem("tenantEmail") ?? undefined;
            const res = await fetch("/api/request_remove_assigned_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roleId, email: assignedEmail, tenantEmail }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to send confirmation request");
            setRequested(true);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setRequesting(false);
        }
    };

    if (requested) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <span className="text-[13px] text-white/40 line-through">{assignedEmail}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirmation sent
                </span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2">
            <span className="text-[13px] text-white/70">{assignedEmail}</span>
            <button
                onClick={handleRequestRemoval}
                disabled={requesting}
                title="Request removal — a confirmation email will be sent to the assigned person"
                className="flex items-center justify-center w-4 h-4 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
                {requesting ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
            </button>
        </span>
    );
}
