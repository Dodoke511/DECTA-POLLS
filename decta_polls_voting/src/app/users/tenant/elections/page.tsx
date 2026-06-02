"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { CreateElectionModal } from "@/components/tenant_admin/CreateElectionModal";
import { Plus, Link as LinkIcon, Copy, ExternalLink, Check, Rocket, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSubscriptionRestricted } from '@/lib/subscription-limits';
export default function TenantElectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<any[]>([]);
  const [isElectionsLoading, setIsElectionsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [launchingElection, setLaunchingElection] = useState<any>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [token, setToken] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<'BASIC' | 'STANDARD' | 'ENTERPRISE' | 'PENDING' | 'EXPIRED'>('BASIC');
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [expiredElections, setExpiredElections] = useState<any[]>([]);
  const [deletableElectionIds, setDeletableElectionIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ title: string; label: string; onConfirm: () => Promise<void> } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    // Read tenant identity from sessionStorage (set at login)
    const storedUserId = sessionStorage.getItem('tenantUserId') || '';
    setTenantId(storedUserId);
    setToken(storedToken || '');

    // Fetch elections and subscription asynchronously
    if (storedUserId) {
      Promise.all([
        fetch(`/api/get_tenant_elections?tenantId=${storedUserId}`).then(res => res.json()),
        fetch(`/api/get_tenant_subscription?tenantId=${storedUserId}`).then(res => res.json())
      ])
        .then(([electionsData, subscriptionData]) => {
          if (electionsData.elections) {
            setElections(electionsData.elections);
          }
          if (electionsData.tenantSlug) {
            setTenantSlug(electionsData.tenantSlug);
          }
          if (subscriptionData.subscription) {
            setSubscription(subscriptionData.subscription);
            setTenantStatus(subscriptionData.status ?? null);
            setIsRestricted(
              isSubscriptionRestricted(subscriptionData.subscription, subscriptionData.subscription_expires_at) ||
              subscriptionData.status === 'PENDING'
            );
          }
        })
        .catch(err => console.error("Failed fetching data:", err))
  .finally(() => {
    setIsElectionsLoading(false);
    // Fetch expired elections for retention
    fetch(`/api/elections/retention/check?tenantId=${storedUserId}`)
      .then(r => r.json())
      .then(data => setExpiredElections(data.expired || []))
      .catch(err => console.error('Retention fetch error:', err));
    // Fetch deletable elections for deletion button visibility
    fetch(`/api/elections/retention/deletable?tenantId=${storedUserId}`)
      .then(r => r.json())
      .then(data => setDeletableElectionIds(new Set(data.deletable || [])))
      .catch(err => console.error('Deletable elections fetch error:', err));
  });
    } else {
      setIsElectionsLoading(false);
    }

    setLoading(false);
  }, [router]);

  const handleElectionCreated = (electionId: string, tok: string, electionTitle: string, banner: string | null) => {
    setIsModalOpen(false);
    // Redirect to the newly created election workflow setup
    let workflowUrl = `/users/tenant/elections/${electionId}/workflow?role=tenant&random=${tok}&electionTitle=${encodeURIComponent(electionTitle)}`;
    if (banner) {
      workflowUrl += `&banner=${encodeURIComponent(banner)}`;
    }
    router.push(workflowUrl);
  };

  const copyToClipboard = (electionSlug: string, id: string) => {
    const url = `${window.location.origin}/${tenantSlug}/${electionSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLaunch = async () => {
    if (!launchingElection) return;
    if (!canLaunchMore) {
      alert(`You have reached your limit of ${currentActiveElections}/${getActiveElectionsLimit()} active elections for your ${subscription} plan.`);
      return;
    }
    setIsLaunching(true);
    try {
      const res = await fetch('/api/interface/launch_election', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ electionId: launchingElection.id })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: 'Server error occurred.' };
        }
        throw new Error(errorData.error || `Launch failed with status: ${res.status}`);
      }

      const data = await res.json();

      // Show success state in modal for a moment
      setTimeout(() => {
        setElections(prev => prev.map(e =>
          e.id === launchingElection.id ? { ...e, status: 'ACTIVE' } : e
        ));
        setLaunchingElection(null);
      }, 1000);

    } catch (err: any) {
      console.error('Launch error:', err);
      alert(err.message || 'An unexpected error occurred during launch.');
    } finally {
      setIsLaunching(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
  }


  const activeElections = elections.filter(e => ['DRAFT', 'PUBLISHED', 'ACTIVE'].includes(e.status));
  const completedElections = elections.filter(e => ['COMPLETED', 'FAILED'].includes(e.status));

  // Helper functions for subscription limits
  const getActiveElectionsLimit = () => {
    return 1; // Strict 1 active election limit across all tiers
  };

  const getTotalElectionsLimit = () => {
    switch (subscription) {
      case 'BASIC': return 50;
      case 'STANDARD': return 200;
      case 'ENTERPRISE': return 500;
      default: return 50;
    }
  };

  const currentActiveElections = elections.filter(e => e.status === 'ACTIVE').length;
  const canLaunchMore = currentActiveElections < getActiveElectionsLimit();
  const canCreateMore = elections.length < getTotalElectionsLimit();

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/elections" isRestricted={isRestricted} />

        <main className={`relative super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border border-white/10 p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none ${isRestricted ? 'pointer-events-none opacity-40' : ''}`}>
          <h1 className="mb-10 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Elections</h1>
          {isRestricted && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070f]/95 p-6 text-center">
              <div className="max-w-xl rounded-[28px] border border-white/10 bg-[#090b14] p-8 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
                <h2 className="text-2xl font-bold text-white">Tenant account access is restricted</h2>
                <p className="mt-3 text-sm text-white/70">This tenant account is expired or pending approval. All management pages are locked. Please use Settings to renew or sign out.</p>
                <button
                  onClick={() => {
                    const destination = `/users/tenant/settings?role=tenant&random=${token}`;
                    window.location.href = `/loader?destination=${encodeURIComponent(destination)}&duration=700`;
                  }}
                  className="mt-6 inline-flex items-center justify-center rounded-[16px] bg-[#5D44F8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#7c68ff]"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          )}
{expiredElections.length > 0 && (
  <div className="mb-8 rounded-[20px] border border-orange-500/20 bg-gradient-to-r from-orange-600/10 to-amber-600/10 p-6 shadow-[0_4px_30px_rgba(217,119,6,0.05)] backdrop-blur-md">
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-[#F1F0F3] tracking-tight">Data Retention Alert</h2>
        <p className="mt-1 text-sm text-[#F1F0F3]/70">
          The following completed elections have exceeded the configured retention period and will be permanently removed.
        </p>
        
        <ul className="mt-4 divide-y divide-white/5 border-t border-white/5">
          {expiredElections.map((e) => (
            <li key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-semibold text-white/95 truncate">{e.title || e.name}</span>
                <span className="text-xs text-orange-300/80 flex items-center gap-1.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Auto-deleting in {e.remainingHours} {e.remainingHours === 1 ? 'hour' : 'hours'}
                </span>
              </div>
              <button
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.97] text-white text-xs font-bold shadow-[0_0_16px_rgba(220,38,38,0.45)] transition-all"
                onClick={() => {
                  const capturedId = e.id;
                  const capturedTitle = e.title || e.name;
                  setDeleteTarget({
                    title: capturedTitle,
                    label: 'Expired',
                    onConfirm: async () => {
                      const res = await fetch('/api/elections/retention/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenantId, electionId: capturedId })
                      });
                      if (res.ok) {
                        setExpiredElections(prev => prev.filter(ev => ev.id !== capturedId));
                      } else {
                        const err = await res.json();
                        throw new Error(err.error ?? 'Deletion failed');
                      }
                    }
                  });
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Now
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}

          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em]">Current Elections</h2>

              {isElectionsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                  <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                </div>
              ) : activeElections.length <= 1 ? (
                /* FEATURED STYLE (1 or 0 elections) */
                <div className="flex flex-wrap gap-12">
                  <div className="flex flex-col gap-4">
                    <button
                      id="open-create-election-modal"
                      onClick={() => canCreateMore ? setIsModalOpen(true) : null}
                      disabled={!canCreateMore}
                      className={`h-[220px] w-[220px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center transition-all group shadow-2xl backdrop-blur-md ${
                        canCreateMore 
                          ? 'hover:bg-white/10 cursor-pointer' 
                          : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className={`p-4 border-2 rounded-xl transition-transform duration-300 ${
                        canCreateMore 
                          ? 'border-[#5D44F8] group-hover:scale-110' 
                          : 'border-white/20'
                      }`}>
                        <Plus className={`w-10 h-10 ${canCreateMore ? 'text-[#5D44F8]' : 'text-white/30'}`} />
                      </div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-white/80">Create Election</span>
                      {!canCreateMore && (
                        <span className="text-xs text-amber-400 font-medium">
                          Limit reached ({elections.length}/{getTotalElectionsLimit()})
                        </span>
                      )}
                    </div>
                  </div>

                  {activeElections.length === 1 ? (
                    <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
                      <div
                        onClick={() => handleElectionCreated(activeElections[0].id, token, activeElections[0].title, activeElections[0].banner)}
                        className="h-[220px] w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer relative overflow-hidden"
                      >
                        {activeElections[0].banner ? (
                          <>
                            <img src={activeElections[0].banner} alt={activeElections[0].title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                            <span className="text-white/20 text-xs font-bold uppercase tracking-widest">No Banner Provided</span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-6">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-lg ${activeElections[0].status === 'DRAFT' ? 'bg-[#D08716] text-white' :
                            activeElections[0].status === 'PUBLISHED' ? 'bg-emerald-500 text-white' :
                              activeElections[0].status === 'ACTIVE' ? 'bg-[#04A947] text-white' :
                                'bg-[#5D44F8] text-white'
                            }`}>
                            {activeElections[0].status === 'PUBLISHED' ? 'Ready to Launch' : activeElections[0].status}
                          </span>
                        </div>

                        {/* Launch Hover Overlay */}
                        {activeElections[0].status === 'PUBLISHED' && (
                          <div className="absolute inset-0 bg-[#140B2D]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-75 transition-opacity duration-300">
                            <span className={`font-bold text-sm tracking-widest uppercase ${
                              canLaunchMore ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {canLaunchMore ? 'Ready to Launch' : 'Launch Limit Reached'}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canLaunchMore) {
                                    setLaunchingElection(activeElections[0]);
                                  }
                                }}
                                disabled={!canLaunchMore}
                                className={`font-bold px-6 py-2 rounded-xl transition-all active:scale-95 ${
                                  canLaunchMore
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                              >
                                <Rocket className="w-4 h-4 mr-2 inline" />
                                {canLaunchMore ? 'Launch Now' : 'Limit Reached'}
                              </button>
                              <button
                                onClick={() => handleElectionCreated(activeElections[0].id, token, activeElections[0].title, activeElections[0].banner)}
                                className="font-bold px-6 py-2 rounded-xl transition-all active:scale-95 hover:bg-[#D08700] bg-[#D08700]/80"
                              >
                                <Settings className="w-4 h-4 mr-2 inline" />
                                <span className="text-white">Configure</span>
                              </button>
                            </div>
                            <p className="text-white/40 text-[10px] max-w-[160px] text-center px-4">
                              {canLaunchMore 
                                ? 'This will make the election site public and start the first election phase.'
                                : `${currentActiveElections}/${getActiveElectionsLimit()} active elections allowed.`
                              }
                            </p>
                          </div>
                        )}

                        {/* Quick Actions (Go to Site / Copy) for Active/Published */}
                        {(activeElections[0].status === 'ACTIVE' || activeElections[0].status === 'PUBLISHED') && (
                          <div className={`absolute top-4 right-4 z-20 flex flex-col items-end gap-2 transition-opacity ${
                            activeElections[0].status === 'ACTIVE' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/${tenantSlug}/${activeElections[0].slug}`, '_blank');
                              }}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-white/25 bg-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_12px_30px_rgba(93,68,248,0.28)]"
                              title="Go to public site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(activeElections[0].slug, activeElections[0].id);
                              }}
                              className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-black/30 text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
                              title="Copy public link"
                            >
                              {copiedId === activeElections[0].id ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
                              {copiedId === activeElections[0].id && (
                                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap">
                                  Copied!
                                </span>
                              )}
                            </button>
                            {activeElections[0].status === 'PUBLISHED' && (
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const capturedId = activeElections[0].id;
                                  const capturedTitle = activeElections[0].title;
                                  setDeleteTarget({
                                    title: capturedTitle,
                                    label: 'Published',
                                    onConfirm: async () => {
                                      const res = await fetch('/api/elections/delete', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tenantId, electionId: capturedId })
                                      });
                                      if (res.ok) { window.location.reload(); }
                                      else { const e = await res.json(); throw new Error(e.error ?? 'Deletion failed'); }
                                    }
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] transition-all"
                                title="Delete election"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}

                        {/* Quick Action for DRAFT */}
                        {activeElections[0].status === 'DRAFT' && (
                          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const capturedId = activeElections[0].id;
                                const capturedTitle = activeElections[0].title;
                                setDeleteTarget({
                                  title: capturedTitle,
                                  label: 'Draft',
                                  onConfirm: async () => {
                                    const res = await fetch('/api/elections/delete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tenantId, electionId: capturedId })
                                    });
                                    if (res.ok) { window.location.reload(); }
                                    else { const e = await res.json(); throw new Error(e.error ?? 'Deletion failed'); }
                                  }
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] transition-all"
                              title="Delete draft election"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-xl font-bold text-white/80">{activeElections[0].title}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
                      <div className="h-[220px] w-full rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center shadow-inner cursor-not-allowed">
                        <span className="text-white/20 text-sm font-medium uppercase tracking-widest">No Active Polls</span>
                      </div>
                      <span className="text-xl font-bold text-white/40">--</span>
                    </div>
                  )}
                </div>
              ) : (
                /* GRID STYLE (Multiple elections) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  <div className="flex flex-col gap-4">
                    <button
                      id="open-create-election-modal"
                      onClick={() => canCreateMore ? setIsModalOpen(true) : null}
                      disabled={!canCreateMore}
                      className={`aspect-square w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center transition-all group shadow-2xl backdrop-blur-md ${
                        canCreateMore 
                          ? 'hover:bg-white/10 cursor-pointer' 
                          : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className={`p-4 border-2 rounded-xl transition-transform duration-300 ${
                        canCreateMore 
                          ? 'border-[#5D44F8] group-hover:scale-110' 
                          : 'border-white/20'
                      }`}>
                        <Plus className={`w-10 h-10 ${canCreateMore ? 'text-[#5D44F8]' : 'text-white/30'}`} />
                      </div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-white/80">Create Election</span>
                      {!canCreateMore && (
                        <span className="text-xs text-amber-400 font-medium">
                          Limit reached ({elections.length}/{getTotalElectionsLimit()})
                        </span>
                      )}
                    </div>
                  </div>

                  {activeElections.map((election) => (
                    <div key={election.id} className="flex flex-col gap-4">
                      <div
                        onClick={() => handleElectionCreated(election.id, token, election.title, election.banner)}
                        className="aspect-square w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer relative overflow-hidden"
                      >
                        {election.banner ? (
                          <>
                            <img src={election.banner} alt={election.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                            <span className="text-white/20 text-xs font-bold uppercase tracking-widest">No Banner</span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-lg ${election.status === 'DRAFT' ? 'bg-[#D08716] text-white' :
                            election.status === 'PUBLISHED' ? 'bg-emerald-500 text-white' :
                              election.status === 'ACTIVE' ? 'bg-[#04A947] text-white' :
                                'bg-[#5D44F8] text-white'
                            }`}>
                            {election.status === 'PUBLISHED' ? 'Ready' : election.status}
                          </span>
                        </div>

                        {/* Launch Hover Overlay */}
                        {election.status === 'PUBLISHED' && (
                          <div className="absolute inset-0 bg-[#140B2D]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className={`font-bold text-xs tracking-widest uppercase ${
                              canLaunchMore ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {canLaunchMore ? 'Ready to Launch' : 'Launch Limit Reached'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canLaunchMore) {
                                  setLaunchingElection(election);
                                }
                              }}
                              disabled={!canLaunchMore}
                              className={`font-bold px-4 py-1.5 rounded-lg text-xs transition-all active:scale-95 ${
                                canLaunchMore
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                  : 'bg-white/10 text-white/40 cursor-not-allowed'
                              }`}
                            >
                              {canLaunchMore ? 'Launch Now' : 'Limit Reached'}
                            </button>
                          </div>
                        )}

                        {/* Quick Actions (Go to Site / Copy) for Active/Published */}
                        {(election.status === 'ACTIVE' || election.status === 'PUBLISHED') && (
                          <div className={`absolute top-4 right-4 z-20 flex flex-col items-end gap-2 transition-opacity ${
                            election.status === 'ACTIVE' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/${tenantSlug}/${election.slug}`, '_blank');
                              }}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_12px_30px_rgba(93,68,248,0.28)]"
                              title="Go to public site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(election.slug, election.id);
                              }}
                              className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-black/30 text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
                              title="Copy public link"
                            >
                              {copiedId === election.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
                              {copiedId === election.id && (
                                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap">
                                  Copied!
                                </span>
                              )}
                            </button>
                            {election.status === 'PUBLISHED' && (
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const capturedId = election.id;
                                  const capturedTitle = election.title;
                                  setDeleteTarget({
                                    title: capturedTitle,
                                    label: 'Published',
                                    onConfirm: async () => {
                                      const res = await fetch('/api/elections/delete', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tenantId, electionId: capturedId })
                                      });
                                      if (res.ok) { window.location.reload(); }
                                      else { const e = await res.json(); throw new Error(e.error ?? 'Deletion failed'); }
                                    }
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] transition-all"
                                title="Delete election"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}

                        {/* Quick Action for DRAFT */}
                        {election.status === 'DRAFT' && (
                          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const capturedId = election.id;
                                const capturedTitle = election.title;
                                setDeleteTarget({
                                  title: capturedTitle,
                                  label: 'Draft',
                                  onConfirm: async () => {
                                    const res = await fetch('/api/elections/delete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tenantId, electionId: capturedId })
                                    });
                                    if (res.ok) { window.location.reload(); }
                                    else { const e = await res.json(); throw new Error(e.error ?? 'Deletion failed'); }
                                  }
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] transition-all"
                              title="Delete draft election"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-xl font-bold text-white/80 line-clamp-1" title={election.title}>
                        {election.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Section: Past Elections */}
            <div className="flex flex-col gap-6">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em]">Past Elections</h2>
              {completedElections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {completedElections.map((election) => (
                    <div key={election.id} className="flex flex-col gap-4">
                      <div
                        onClick={() => {
                          const tok = sessionStorage.getItem('tenantToken');
                          router.push(`/users/tenant/elections/${election.id}/results?role=tenant&random=${tok}`);
                        }}
                        className="aspect-square w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer relative overflow-hidden"
                      >
                        {election.banner ? (
                          <img src={election.banner} alt={election.title} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <span className="text-white/10 text-xs font-bold uppercase tracking-widest">{election.status}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors"></div>
                        
                        {/* Quick Actions (Go to Site / Copy) for Past Elections */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/${tenantSlug}/${election.slug}`, '_blank');
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_12px_30px_rgba(93,68,248,0.28)]"
                            title="Go to public site"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(election.slug, election.id);
                            }}
                            className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-black/30 text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
                            title="Copy public link"
                          >
                            {copiedId === election.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
                            {copiedId === election.id && (
                              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap">
                                Copied!
                              </span>
                            )}
                          </button>
                          {deletableElectionIds.has(election.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const capturedId = election.id;
                                const capturedTitle = election.title;
                                setDeleteTarget({
                                  title: capturedTitle,
                                  label: 'Completed',
                                  onConfirm: async () => {
                                    const res = await fetch('/api/elections/retention/delete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tenantId, electionId: capturedId })
                                    });
                                    if (res.ok) { window.location.reload(); }
                                    else { const e = await res.json(); throw new Error(e.error ?? 'Deletion failed'); }
                                  }
                                });
                              }}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/30 bg-red-600/20 text-red-400 shadow-[0_8px_24px_rgba(220,38,38,0.2)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-red-600/40 hover:shadow-[0_12px_30px_rgba(220,38,38,0.3)] hover:text-red-300 animate-in slide-in-from-bottom-2 duration-300"
                              title="Delete completed election"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 z-10">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                            election.status === 'COMPLETED' 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {election.status === 'COMPLETED' ? 'Completed' : 'Failed'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-white/40">{election.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] flex items-center justify-center">
                  <p className="text-white/10 text-xs font-bold uppercase tracking-widest">No past elections recorded</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[#110820] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Red ambient glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

            <div className="relative px-8 pt-8 pb-10 flex flex-col items-center text-center gap-6">
              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/25 shadow-[0_0_32px_rgba(239,68,68,0.2)]">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>

              {/* Copy */}
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">Delete Election?</h3>
                <p className="text-sm text-white/55 leading-relaxed">
                  You are about to permanently delete the{' '}
                  <span className="font-semibold text-white/80">{deleteTarget.label}</span> election:
                </p>
                <p className="mt-1 text-base font-bold text-white truncate max-w-[320px]">
                  &ldquo;{deleteTarget.title}&rdquo;
                </p>
              </div>

              {/* Danger notice */}
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  ⚠&nbsp; This action is permanent and cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex w-full gap-3 pt-1">
                <button
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="w-28 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await deleteTarget.onConfirm();
                      setDeleteTarget(null);
                    } catch (err: any) {
                      alert(err.message ?? 'Deletion failed. Please try again.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 px-4 text-sm font-bold text-white whitespace-nowrap shadow-[0_0_24px_rgba(220,38,38,0.4)] transition-all hover:bg-red-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Launch Confirmation Modal */}
      {launchingElection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLaunching && setLaunchingElection(null)} />
          <div className="relative w-full max-w-md bg-[#140B2D] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="relative text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Plus className="w-10 h-10 text-emerald-500 rotate-45 transform" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Final Decision?</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  You are about to launch <span className="text-white font-bold">{launchingElection.title}</span>.
                  This will make the site accessible to the public and immediately activate the Filing Phase.
                </p>
                <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <p className="text-red-400 text-[11px] font-medium uppercase tracking-wider">
                    ⚠ Warning: This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  disabled={isLaunching}
                  onClick={() => setLaunchingElection(null)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isLaunching}
                  onClick={handleLaunch}
                  className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${isLaunching && !launchingElection.status_updated
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400'
                    }`}
                >
                  {isLaunching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      {elections.find(e => e.id === launchingElection.id)?.status === 'ACTIVE'
                        ? 'Successfully Launched!'
                        : 'Launching...'}
                    </>
                  ) : (
                    'Yes, Launch it!'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Election Modal */}
      <CreateElectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleElectionCreated}
        tenantId={tenantId}
        token={token}
      />
    </div>
  );
}

