import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AuthModuleSection } from './modules/interface_build/AuthModuleSection';
import { UserAccessSection } from './modules/interface_build/UserAccessSection';
import { NavigationLabelsSection } from './modules/interface_build/NavigationLabelsSection';
import { BrandingSection } from './modules/interface_build/BrandingSection';
import { PreviewSection } from './modules/interface_build/PreviewSection';
import { authFetch } from '@/lib/authFetch';
import { canUseInterfaceBuilder, normalizeSubscription, type SubscriptionTier } from '@/lib/subscription-limits';

type SiteConfig = Record<string, unknown>;

interface ElectionInfo {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
}

interface TenantBranding {
  main_color?: string | null;
  secondary_color?: string | null;
  third_color?: string | null;
  logo_url?: string | null;
}

export function ElectionInterfaceTab({ electionId }: { electionId: string }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [election, setElection] = useState<ElectionInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionTier>('BASIC');
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await authFetch(`/api/interface/get_config?electionId=${electionId}`);
        
        if (res.ok) {
          const { config: fetchedConfig, election: fetchedElection, subscription: fetchedSub, tenantBranding: fetchedBranding, tenantSlug: fetchedSlug } = await res.json();
          if (fetchedConfig) setConfig(fetchedConfig);
          if (fetchedElection) setElection(fetchedElection);
          if (fetchedSub) setSubscription(normalizeSubscription(fetchedSub));
          if (fetchedBranding) setTenantBranding(fetchedBranding);
          if (fetchedSlug) setTenantSlug(fetchedSlug);
        } else {
          const err = await res.json();
          if (err.error === 'JWT expired' || res.status === 401) {
            setError('JWT_EXPIRED');
          } else {
            console.error('Error fetching site config:', err.error);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
           setError('JWT_EXPIRED');
        }
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  const updateConfig = (updates: SiteConfig) => {
    setConfig((prev) => ({ ...(prev ?? {}), ...updates }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const tenantUserId = sessionStorage.getItem('tenantUserId');

      try {
        const res = await authFetch('/api/interface/save_config', {
          method: 'POST',
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
        <Link
          href="/auth/login_form"
          className="px-8 py-3 rounded-xl bg-[#5D44F8] text-white font-bold hover:bg-[#4a35cf] transition-all shadow-lg"
        >
          Log In Again
        </Link>
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

  if (!canUseInterfaceBuilder(subscription)) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center shadow-[0_24px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60">
          <span className="text-2xl font-black">B</span>
        </div>
        <h2 className="mb-3 text-2xl font-bold text-white">Interface Builder Locked</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-white/50">
          Basic accounts use the predefined public election website with a white and grey theme. Upgrade to customize branding, navigation, access, and interface modules.
        </p>
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
          defaultTitle={election?.title ?? undefined}
          defaultWelcome={election?.description ?? undefined}
        />
        <AuthModuleSection config={config} onUpdate={updateConfig} />
        <UserAccessSection config={config} onUpdate={updateConfig} subscription={subscription} />
        <NavigationLabelsSection config={config} onUpdate={updateConfig} />
        <PreviewSection 
          electionId={electionId} 
          tenantSlug={tenantSlug} 
          electionSlug={election?.slug ?? undefined} 
        />
      </div>
    </div>
  );
}
