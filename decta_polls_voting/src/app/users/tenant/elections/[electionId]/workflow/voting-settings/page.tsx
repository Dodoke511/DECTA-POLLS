'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowHeader } from '@/components/tenant_admin/election_workflow/WorkflowHeader';
import { ChevronLeft, Vote, Calendar, Users, Shield, Construction } from 'lucide-react';

export default function VotingSettingsPage() {
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

    const p = new URLSearchParams();
    p.set('role', 'tenant');
    if (random) p.set('random', random);
    setAuthParams(p.toString());

    setLoading(false);
  }, [router]);

  const goBack = () => {
    router.push(`/users/tenant/elections/${electionId}/workflow?${authParams}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#090215] flex items-center justify-center text-white/50 text-sm tracking-widest uppercase">Loading...</div>;
  }

  return (
    <div
      className="flex flex-col h-screen text-white overflow-hidden relative"
      style={{ background: 'linear-gradient(180deg, #170d36 0%, #0c041f 40%, #060113 100%)' }}
    >
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-[#6648EB] rounded-full blur-[180px] opacity-[0.06] pointer-events-none" />

      <WorkflowHeader electionTitle={electionTitle} banner={banner} electionId={electionId} />

      {/* Sub-nav breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 bg-[#140B2D]/80 backdrop-blur-md border-b border-white/8 text-[12px]">
        <button onClick={goBack} className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Pipeline
        </button>
        <span className="text-white/20">/</span>
        <span className="text-[#A78BFA] font-medium">Voting Settings</span>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
        <div className="max-w-3xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#6648EB]/20 border border-[#6648EB]/30 flex items-center justify-center">
              <Vote className="w-6 h-6 text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-white/90">Voting Settings</h1>
              <p className="text-[13px] text-white/40">Configure ballot type, voter eligibility, and voting period</p>
            </div>
          </div>

          {/* Coming soon placeholder */}
          <div className="rounded-[20px] border border-white/5 bg-[#1C162E]/70 backdrop-blur-xl p-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#6648EB]/10 border border-[#6648EB]/20 flex items-center justify-center">
              <Construction className="w-8 h-8 text-[#A78BFA]/60" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-white/70">Voting Configuration</p>
              <p className="text-[13px] text-white/35 mt-1 max-w-md">
                Ballot type, voter eligibility rules, voting window, and cast-vote limits will be configurable here.
                This settings panel is under active development.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {['Ballot Type', 'Voter Eligibility', 'Voting Period', 'Vote Limit', 'Anonymity Settings'].map(item => (
                <span key={item} className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-white/35 bg-white/3">
                  {item}
                </span>
              ))}
            </div>
            <button
              onClick={goBack}
              className="mt-2 flex items-center gap-2 text-[13px] font-medium text-[#A78BFA] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Return to Pipeline
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
