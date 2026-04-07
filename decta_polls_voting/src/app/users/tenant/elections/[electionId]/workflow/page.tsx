"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowHeader } from '@/components/tenant_admin/election_workflow/WorkflowHeader';
import { WorkflowTabs } from '@/components/tenant_admin/election_workflow/WorkflowTabs';
import { PositionsModule } from '@/components/tenant_admin/election_workflow/modules/PositionsModule';

export default function ElectionWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const electionId = params.electionId as string;

  const [loading, setLoading] = useState(true);
  const [electionTitle, setElectionTitle] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    // Basic auth check mirroring other tenant pages
    const searchParams = new URLSearchParams(window.location.search);
    const role = searchParams.get('role');
    const random = searchParams.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    setElectionTitle(searchParams.get('electionTitle'));
    setBanner(searchParams.get('banner'));

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-[#090215] flex items-center justify-center text-white/50 text-sm tracking-widest uppercase">Initializing Engine...</div>;
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden relative" style={{ background: "linear-gradient(180deg, #170d36 0%, #0c041f 40%, #060113 100%)" }}>
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#6648EB] rounded-full blur-[160px] opacity-[0.07] pointer-events-none" />

      <WorkflowHeader electionTitle={electionTitle} banner={banner} electionId={electionId} />
      <WorkflowTabs />

      {/* Main Workflow Builder Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        <PositionsModule electionId={electionId} />
      </main>
    </div>
  );
}
