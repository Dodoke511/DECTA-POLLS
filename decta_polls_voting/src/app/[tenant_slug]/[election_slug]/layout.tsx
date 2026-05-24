import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getElectionUserContext } from '@/lib/public-election/session';
import { buildRoleAwareNav } from '@/lib/public-election/nav-builder';
import ComingSoon from '@/components/public-election/ComingSoon';
import ElectionNotFound from '@/components/public-election/ElectionNotFound';
import { PublicElectionShell } from '@/components/public-election/PublicElectionShell';
import { BASIC_PUBLIC_SITE_COLORS, normalizeSubscription } from '@/lib/subscription-limits';
import { ElectionPublicProvider } from '@/contexts/ElectionPublicContext';

export default async function PublicElectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant_slug: string; election_slug: string }>;
}) {
  const { tenant_slug, election_slug } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch Tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenant_slug)
    .eq('is_verified', true)
    .single();

  if (!tenant) notFound();

  // 2. Fetch Election
  const { data: election } = await supabase
    .from('election')
    .select('*')
    .eq('slug', election_slug)
    .eq('tenantID', tenant.id)
    .single();

  if (!election) notFound();

  // 3. Fetch Config & Phases
  const [{ data: siteConfig }, { data: phasesData }] = await Promise.all([
    supabase.from('election_site_config').select('*').eq('election_id', election.id).maybeSingle(),
    supabase.from('election phase').select('*').eq('electionID', election.id).order('phase_index', { ascending: true })
  ]);

  const phases = phasesData || [];

  // 4. Fetch User Context
  const userContext = await getElectionUserContext(supabase, tenant.id, election.id);

  // Effective Brand Colors
  const subscription = normalizeSubscription(tenant.subscription);
  const primaryColor = subscription === 'BASIC'
    ? BASIC_PUBLIC_SITE_COLORS.primary
    : siteConfig?.override_color || tenant.main_color || '#5D44F8';
  const secondaryColor = subscription === 'BASIC'
    ? BASIC_PUBLIC_SITE_COLORS.secondary
    : siteConfig?.secondary_override_color || tenant.secondary_color || '#7c60ff';
  const thirdColor = subscription === 'BASIC'
    ? BASIC_PUBLIC_SITE_COLORS.third
    : siteConfig?.third_override_color || tenant.third_color || '#A78BFA';
  const basePath = `/${tenant_slug}/${election_slug}`;

  // 5. Build Nav
  const navItems = buildRoleAwareNav(phases, userContext, siteConfig, basePath);

  const contextValue = {
    tenant,
    election,
    siteConfig,
    phases,
    brandColor: primaryColor,
    primaryColor,
    secondaryColor,
    thirdColor,
    navItems,
    userContext,
    basePath
  };

  // 6. Status-based Guardrails
  const status = election.status?.toUpperCase();
  const isDev = process.env.NODE_ENV === 'development';
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is a tenant admin for this specific tenant
  let isTenantAdmin = false;
  if (user) {
    const { data: tenantUser } = await supabase
      .from('tenant users')
      .select('user_type')
      .eq('id', user.id)
      .eq('tenantID', tenant.id)
      .maybeSingle();

    if (tenantUser && ['admin', 'sub-admin', 'tenant user'].includes(tenantUser.user_type?.toLowerCase())) {
      isTenantAdmin = true;
    }
  }

  // Guardrail Logic
  if (status === 'DRAFT' && !isTenantAdmin && !isDev) {
    return (
      <ElectionPublicProvider value={contextValue}>
        <ElectionNotFound />
      </ElectionPublicProvider>
    );
  }

  if (status === 'PUBLISHED' && !isTenantAdmin) {
    return (
      <ElectionPublicProvider value={contextValue}>
        <ComingSoon
          title={siteConfig?.public_title || election.title}
          banner={siteConfig?.banner_url || election.banner}
          primaryColor={primaryColor}
        />
      </ElectionPublicProvider>
    );
  }

  // If ACTIVE or Tenant Admin (for preview), render full site
  return (
    <ElectionPublicProvider value={contextValue}>
      <PublicElectionShell
        contextValue={contextValue}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        thirdColor={thirdColor}
      >
        {children}
      </PublicElectionShell>
    </ElectionPublicProvider>
  );
}
