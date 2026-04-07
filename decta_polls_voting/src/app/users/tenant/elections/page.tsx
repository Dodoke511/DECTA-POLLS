"use client";

import React, { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { CreateElectionModal } from "@/components/tenant_admin/CreateElectionModal";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
export default function TenantElectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [featuredElection, setFeaturedElection] = useState<any>(null);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [token, setToken] = useState("");

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
    console.log(storedUserId);

    setToken(storedToken || '');

    // Fetch the featured election asynchronously
    if (storedUserId) {
      fetch(`/api/get_tenant_elections?tenantId=${storedUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.featured) {
            setFeaturedElection(data.featured);
          }
        })
        .catch(err => console.error("Failed fetching featured election:", err))
        .finally(() => setIsFeaturedLoading(false));
    } else {
      setIsFeaturedLoading(false);
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

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
  }

  const pastElections = [
    "CIT-U SHS",
    "CIT-U JHS",
    "CIT-U CSS ORG.",
    "CIT-U ICEPEP ORG.",
    "CIT-U JPSME ORG.",
    "CIT-U SSG"
  ];

  return (
    <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/elections" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border border-white/10 p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none">
          <h1 className="mb-10 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Elections</h1>

          <div className="flex flex-col gap-12">
            {/* Top Row: Create and Posted */}
            <div className="flex flex-wrap gap-12">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em]">Create New Poll</h2>
                <button
                  id="open-create-election-modal"
                  onClick={() => setIsModalOpen(true)}
                  className="h-[220px] w-[220px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer"
                >
                  <div className="p-4 border-2 border-[#5D44F8] rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Plus className="w-10 h-10 text-[#5D44F8]" />
                  </div>
                </button>
                <span className="text-xl font-bold text-white/80">Blank Poll</span>
              </div>

              <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
                <h2 className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em]">
                  {isFeaturedLoading
                    ? "Loading..."
                    : featuredElection?.status === 'DRAFT'
                      ? "Recently Created Draft"
                      : featuredElection?.status === 'POSTED'
                        ? "Active Election"
                        : "Posted Election"
                  }
                </h2>

                {featuredElection ? (
                  <>
                    <div
                      onClick={() => handleElectionCreated(featuredElection.id, token, featuredElection.title, featuredElection.banner)}
                      className="h-[220px] w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer relative overflow-hidden"
                    >
                      {featuredElection.banner ? (
                        <>
                          <img src={featuredElection.banner} alt={featuredElection.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-4 left-6">
                            <span className="bg-[#5D44F8] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">{featuredElection.status}</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-white/30 text-sm font-medium">No Banner Provided</span>
                          <div className="mt-4">
                            <span className="bg-[#5D44F8] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">{featuredElection.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xl font-bold text-white/80">{featuredElection.title}</span>
                  </>
                ) : (
                  <>
                    <div className="h-[220px] w-full rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center shadow-inner cursor-not-allowed">
                      <span className="text-white/20 text-sm font-medium uppercase tracking-widest">No Polls Available</span>
                    </div>
                    <span className="text-xl font-bold text-white/40">--</span>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Section: Past Elections */}
            <div className="flex flex-col gap-6">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em]">Past Elections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {pastElections.map((name, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    <div className="aspect-square w-full rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-md cursor-pointer overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-tr from-white/5 to-transparent"></div>
                    </div>
                    <span className="text-xl font-bold text-white/80">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

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

