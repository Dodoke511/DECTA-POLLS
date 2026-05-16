"use client";

import React, { useState, useEffect } from 'react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { useRouter } from 'next/navigation';
import { ElectionAuthModule } from '@/components/public-election/auth/ElectionAuthModule';
import { Clock, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function CandidateFilingPage() {
  const router = useRouter();
  const { userContext, phases, tenant, election, brandColor } = useElectionPublic();
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isFilingActive = isPhaseActive(phases, 'filing');

  useEffect(() => {
    async function checkStatus() {
      if (!userContext?.userId) {
        setLoading(false);
        return;
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase
        .from('candidate')
        .select('status')
        .eq('userID', userContext.userId)
        .eq('electionID', election.id)
        .maybeSingle();

      setCandidateStatus(data?.status);

      if (data?.status === 'DRAFT') {
        router.push(`/${tenant.slug}/${election.slug}/file/candidacy-form`);
      } else if (data?.status === 'APPROVED' || data?.status === 'FLAGGED') {
        router.push(`/${tenant.slug}/${election.slug}/candidate-dashboard`);
      } else {
        setLoading(false);
      }
    }

    checkStatus();
  }, [userContext, election.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12 px-6 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-slate-400 font-medium animate-pulse">Verifying Credentials...</p>
      </div>
    );
  }

  if (!userContext) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <ElectionAuthModule />
      </div>
    );
  }

  if (userContext.isVoter) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div className="max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-500 leading-relaxed">This page is reserved for candidate registration and filing. Voters cannot access this module.</p>
        </div>
      </div>
    );
  }

  // Handle Verification Gatekeeper
  if (candidateStatus === 'PENDING_VERIFICATION') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden">
          <div className="bg-slate-50 p-12 text-center border-b border-slate-100">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Verification Pending</h1>
            <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
              Your account has been created successfully! The election organizers are currently reviewing your registration.
            </p>
          </div>
          <div className="p-8 bg-white flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Secure Verification in Progress</span>
            </div>
            <p className="text-sm text-slate-400 text-center">You will be notified once your candidacy has been approved for filing.</p>
          </div>
        </div>
      </div>
    );
  }

  if (candidateStatus === 'REJECTED') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
        <div className="max-w-md p-12 bg-white border border-slate-200 rounded-[32px] shadow-xl text-center">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Application Rejected</h2>
          <p className="text-slate-500 leading-relaxed">Unfortunately, your candidacy registration has been rejected by the organizers. Please contact the election office for more information.</p>
        </div>
      </div>
    );
  }

  // APPROVED candidates are handled by the useEffect redirect above.
  // This fallback just shows a spinner for the brief moment before redirect.
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
      <p className="text-slate-400 font-medium animate-pulse">Redirecting to your dashboard...</p>
    </div>
  );
}
