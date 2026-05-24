"use client";

import React from 'react';
import Link from 'next/link';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { CheckCircle2, Download, Home, Info } from 'lucide-react';

export default function VoteConfirmationPage() {
  const { userContext, election, tenant, siteConfig, basePath, brandColor } = useElectionPublic();
  const primaryColor = brandColor || '#5D44F8';

  if (!userContext?.isVoter) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-500">This page is for registered voters only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-700">
      <div 
        className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] shadow-2xl"
        style={{ backgroundColor: primaryColor }}
      >
        <CheckCircle2 className="h-12 w-12 text-white" />
      </div>
      
      <h1 className="text-4xl font-black text-slate-900 md:text-5xl">Vote Submitted!</h1>
      <p className="mt-4 text-lg font-medium text-slate-600">
        Thank you for participating in <span className="font-bold text-slate-900">{election?.title}</span>.
        Your ballot has been securely encrypted and officially recorded.
      </p>

      <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl text-left">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center gap-2">
           <Info className="h-5 w-5 text-slate-400" />
           <span className="text-sm font-bold text-slate-700">What happens next?</span>
        </div>
        <div className="p-6 md:p-8">
           <ul className="space-y-6">
             <li className="flex items-start gap-4">
               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">1</div>
               <div>
                 <h3 className="font-bold text-slate-900">End-to-End Encryption</h3>
                 <p className="mt-1 text-sm font-medium text-slate-600">Your vote is sealed with AES-GCM encryption. It cannot be traced back to your identity.</p>
               </div>
             </li>
             <li className="flex items-start gap-4">
               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">2</div>
               <div>
                 <h3 className="font-bold text-slate-900">Tallying Phase</h3>
                 <p className="mt-1 text-sm font-medium text-slate-600">Votes are securely tallied using the configured method (Standard or Ranked Choice).</p>
               </div>
             </li>
             <li className="flex items-start gap-4">
               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">3</div>
               <div>
                 <h3 className="font-bold text-slate-900">Results Publishing</h3>
                 <p className="mt-1 text-sm font-medium text-slate-600">Once the election concludes and administrators verify the integrity checks, results will be published.</p>
               </div>
             </li>
           </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link 
          href={`${basePath}/dashboard`}
          className="flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto"
          style={{ backgroundColor: primaryColor }}
        >
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Save Receipt
        </button>
      </div>
    </div>
  );
}
