"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DarkVeil from '@/components/mainlanding/ui/DarkVeil';

export default function LoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = searchParams.get('destination') || '/auth/login_form';

  useEffect(() => {
    // Navigate to destination after 2.5 seconds - shows most of one animation cycle
    const timer = setTimeout(() => {
      router.push(destination);
    }, 2500);

    return () => clearTimeout(timer);
  }, [router, destination]);

  return (
    <div className="min-h-screen relative text-decta-text font-source-sans overflow-hidden selection:bg-decta-brand selection:text-white flex items-center justify-center">
      {/* Same DarkVeil Background as Landing Page */}
      <div className="fixed inset-0 -z-[100] pointer-events-none w-full h-full overflow-hidden">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={1.2}
          scanlineFrequency={0}
          warpAmount={0}
          resolutionScale={1}
        />
      </div>

      {/* Almost Full Screen Glassmorphism Container */}
      <div className="glass-card w-[95vw] h-[90vh] flex items-center justify-center mx-auto">
        <div className="loader font-montserrat font-bold text-white">
          Loading
          <div className="words">
            <span className="word">Ballots</span>
            <span className="word">Access</span>
            <span className="word">Results</span>
            <span className="word">Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}