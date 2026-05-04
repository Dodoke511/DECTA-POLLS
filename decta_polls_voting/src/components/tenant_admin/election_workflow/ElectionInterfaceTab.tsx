import React, { useState, useEffect, useRef } from 'react';
import { AuthModuleSection } from './modules/interface_build/AuthModuleSection';
import { UserAccessSection } from './modules/interface_build/UserAccessSection';
import { NavigationLabelsSection } from './modules/interface_build/NavigationLabelsSection';
import { BrandingSection } from './modules/interface_build/BrandingSection';
import { PreviewSection } from './modules/interface_build/PreviewSection';
export function ElectionInterfaceTab({ electionId }: { electionId: string }) {
  const [config, setConfig] = useState<any>(null);
  const [election, setElection] = useState<any>(null);
  const [subscription, setSubscription] = useState<'BASIC' | 'STANDARD' | 'ENTERPRISE'>('BASIC');
  const [tenantBranding, setTenantBranding] = useState<any>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      const token = sessionStorage.getItem('supabaseToken');

      if (!token || token.split('.').length !== 3) {
        setError('SESSION_MISSING');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/interface/get_config?electionId=${electionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const { config: fetchedConfig, election: fetchedElection, subscription: fetchedSub, tenantBranding: fetchedBranding, tenantSlug: fetchedSlug } = await res.json();
          if (fetchedConfig) setConfig(fetchedConfig);
          if (fetchedElection) setElection(fetchedElection);
          if (fetchedSub) setSubscription(fetchedSub);
          if (fetchedBranding) setTenantBranding(fetchedBranding);
          if (fetchedSlug) setTenantSlug(fetchedSlug);
        } else {
          const err = await res.json();
          if (err.error === 'JWT expired') {
            setError('JWT_EXPIRED');
          } else {
            console.error('Error fetching site config:', err.error);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  const updateConfig = (updates: any) => {
    // 1. Immediate UI update (Optimistic)
    setConfig((prev: any) => ({ ...prev, ...updates }));

    // 2. Clear existing timer
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // 3. Set new timer to save after 500ms of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      const tenantUserId = sessionStorage.getItem('tenantUserId');
      const token = sessionStorage.getItem('supabaseToken');

      try {
        const res = await fetch('/api/interface/save_config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            electionId,
            updates,
            tenantUserId
          })
        });

        if (!res.ok) {
          const err = await res.json();
          console.error('Save failed:', err.error);
        }
      } catch (err) {
        console.error('Save error:', err);
      }
    }, 500);
  };

  if (error === 'JWT_EXPIRED' || error === 'SESSION_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Session Expired</h3>
          <p className="text-white/50 text-sm max-w-sm">
            Your authentication session has timed out for security. Please log in again to continue managing the election interface.
          </p>
        </div>
        <a
          href="/auth/login_form"
          className="px-8 py-3 rounded-xl bg-[#5D44F8] text-white font-bold hover:bg-[#4a35cf] transition-all shadow-lg"
        >
          Log In Again
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-10 flex flex-col items-center justify-center h-48 space-y-4">
        <div className="loader font-montserrat font-bold text-white text-xl">
          Loading
          <div className="words ml-2">
            <span className="word">Branding</span>
            <span className="word">User Access</span>
            <span className="word">Navigation</span>
            <span className="word">Identity</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Public Election Site Configration</h2>
        <p className="text-white/60 text-sm">
          Configure the public-facing portal where candidates register and voters cast their ballots.
        </p>
      </div>

      <div className="space-y-4">
        <BrandingSection
          config={config}
          onUpdate={updateConfig}
          tenantBranding={tenantBranding}
          defaultTitle={election?.title}
          defaultWelcome={election?.description}
        />
        <AuthModuleSection config={config} onUpdate={updateConfig} />
        <UserAccessSection config={config} onUpdate={updateConfig} subscription={subscription} />
        <NavigationLabelsSection config={config} onUpdate={updateConfig} />
        <PreviewSection 
          electionId={electionId} 
          tenantSlug={tenantSlug} 
          electionSlug={election?.slug} 
        />
      </div>
    </div>
  );
}
