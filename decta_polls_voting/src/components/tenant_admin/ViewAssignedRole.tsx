"use client";

import React from "react";

export function ViewAssignedRole() {
    const assignedRoles = [
        {
            id: 1,
            roleName: "Voting Manager",
            account: "kneegaw@cit.edu",
            permission: "Voters page",
            pillStyle: "border-[#6c5b96] bg-[#3a2e5d]/60 text-[#a39ec8]",
        },
        {
            id: 2,
            roleName: "Election Observer",
            account: "kneegrow@cit.edu",
            permission: "Candidates page",
            pillStyle: "border-[#387a66] bg-[#22483d]/60 text-[#5db59b]",
        },
        {
            id: 3,
            roleName: "Results Auditor",
            account: "elmaw@cit.edu",
            permission: "Dashboard",
            pillStyle: "border-[#8b5e34] bg-[#4a321f]/60 text-[#c28f64]",
        },
    ];

    return (
        <div className="overflow-x-auto w-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                    <tr className="border-b border-white/[0.05]">
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            ROLE
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            ASSIGNED ACCOUNT
                        </th>
                        <th className="py-2 text-[11px] font-bold uppercase tracking-wider text-white/45 md:pr-8">
                            PERMISSIONS
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {assignedRoles.map((row, index) => (
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
                            <td className="py-4 text-[13px] text-white/50 md:pr-8">
                                {row.account}
                            </td>
                            <td className="py-4 md:pr-8">
                                <span
                                    className={`inline-flex items-center rounded-full border px-3.5 py-1 text-[11px] font-medium tracking-wide ${row.pillStyle}`}
                                >
                                    {row.permission}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
