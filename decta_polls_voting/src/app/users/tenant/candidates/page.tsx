'use client'

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { UserCheck, UserX, Clock, Search, Filter, CheckCircle2, XCircle } from "lucide-react";

export default function TenantCandidatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [token, setToken] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    const storedUserId = sessionStorage.getItem('tenantUserId') || '';
    setTenantId(storedUserId);
    setToken(storedToken || '');

    if (storedUserId) {
      fetchCandidates(storedUserId);
    } else {
      setLoading(false);
    }
  }, [router]);

  const fetchCandidates = async (id: string) => {
    try {
      const res = await fetch(`/api/interface/candidates/get_management?tenantId=${id}`);
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    setActionLoading(candidateId);
    try {
      const res = await fetch('/api/interface/candidates/update_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, status: newStatus })
      });

      if (res.ok) {
        setCandidates(prev => prev.map(c =>
          c.id === candidateId ? { ...c, status: newStatus } : c
        ));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesFilter = filter === 'ALL' || c.status === filter;
    const fullName = `${c.user?.first_name} ${c.user?.surname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      c.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.election?.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 font-medium tracking-widest uppercase text-xs">Synchronizing Records...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/candidates" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>
                Candidate Gatekeeper
              </h1>
              <p className="text-white/40 text-sm mt-1">Verify and manage candidate registrations across your elections.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--tenant-primary)] transition-all w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['ALL', 'PENDING_VERIFICATION', 'APPROVED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[var(--tenant-primary)] text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                      }`}
                  >
                    {f === 'PENDING_VERIFICATION' ? 'Pending' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Candidate Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Election</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Filed Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--tenant-primary)] to-[#A78BFA] flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20">
                            {c.user?.first_name[0]}{c.user?.surname[0]}
                          </div>
                          <div>
                            <div className="font-bold text-white">{c.user?.first_name} {c.user?.surname}</div>
                            <div className="text-xs text-white/40">{c.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                          <span className="text-xs font-medium text-white/80">{c.election?.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/40">
                        {new Date(c.filedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {c.status === 'PENDING_VERIFICATION' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending
                          </div>
                        )}
                        {c.status === 'APPROVED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                        {c.status === 'REJECTED' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {c.status === 'PENDING_VERIFICATION' ? (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStatusUpdate(c.id, 'APPROVED')}
                              disabled={actionLoading === c.id}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                              title="Verify Candidate"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(c.id, 'REJECTED')}
                              disabled={actionLoading === c.id}
                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                              title="Reject Application"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'PENDING_VERIFICATION')}
                            className="text-[10px] font-bold text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest"
                          >
                            Reset Status
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/20">
                          <Filter className="w-8 h-8" />
                        </div>
                        <p className="text-white/40 font-medium">No candidates found matching your criteria.</p>
                      </div>
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
