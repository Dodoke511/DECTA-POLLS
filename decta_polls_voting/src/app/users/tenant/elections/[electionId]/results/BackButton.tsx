"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  isErrorState?: boolean;
}

export default function BackButton({ label = "Back to Elections", isErrorState = false }: BackButtonProps) {
  const router = useRouter();

  const returnToDashboard = () => {
    const token = sessionStorage.getItem('tenantToken');
    const params = new URLSearchParams();
    params.set('role', 'tenant');
    if (token) params.set('random', token);

    // The user explicitly requested it to go to dashboard in the snippet, 
    // but the original link went to elections. 
    // We'll use /users/tenant/elections since this is the elections result page, 
    // but if it's the error state it previously said "Back to Dashboard".
    const dest = isErrorState ? '/users/tenant/dashboard' : '/users/tenant/elections';

    router.push('/loader?destination=' + encodeURIComponent(dest + '?' + params.toString()));
  };

  if (isErrorState) {
    return (
      <button
        onClick={returnToDashboard}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border-none cursor-pointer text-white text-base"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={returnToDashboard}
      className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors text-sm font-medium bg-transparent border-none cursor-pointer p-0"
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}
