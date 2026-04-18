"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowHeader } from '@/components/tenant_admin/election_workflow/WorkflowHeader';
import { WorkflowTabs } from '@/components/tenant_admin/election_workflow/WorkflowTabs';
import { PipelineBuilder } from '@/components/tenant_admin/election_workflow/PipelineBuilder';

export default function ElectionWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const electionId = params.electionId as string;

  const [loading, setLoading] = useState(true);
  const [electionTitle, setElectionTitle] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [authParams, setAuthParams] = useState('');

  useEffect(() => {
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

    // Build auth param string for sub-route navigation
    const p = new URLSearchParams();
    p.set('role', 'tenant');
    if (random) p.set('random', random);
    setAuthParams(p.toString());

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090215] flex items-center justify-center text-white/50 text-sm tracking-widest uppercase">
        Initializing Engine...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen text-white overflow-hidden relative"
      style={{ background: 'linear-gradient(180deg, #170d36 0%, #0c041f 40%, #060113 100%)' }}
    >
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#6648EB] rounded-full blur-[160px] opacity-[0.07] pointer-events-none" />

      <WorkflowHeader electionTitle={electionTitle} banner={banner} electionId={electionId} />
      <WorkflowTabs />

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        <PipelineBuilder electionId={electionId} authParams={authParams} />
      </main>
    </div>
  );
}
