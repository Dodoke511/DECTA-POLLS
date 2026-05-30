import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDisplaySubscription, getDaysUntilExpiry } from '@/lib/subscription-limits';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const tenantId = searchParams.get('tenantId');

    if (!electionId && !tenantId) {
      return NextResponse.json({ error: 'Missing electionId or tenantId.' }, { status: 400 });
    }

    if (electionId) {
      // First find the tenantID for this election
      const { data: election, error: electionError } = await supabase
        .from('election')
        .select('tenantID')
        .eq('id', electionId)
        .single();

      if (electionError || !election) {
        return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
      }

      // Then find the subscription for that tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('subscription, subscription_expires_at')
        .eq('id', election.tenantID)
        .single();

      if (tenantError || !tenant) {
        return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
      }

      return NextResponse.json({
        subscription: getDisplaySubscription(tenant.subscription, tenant.subscription_expires_at),
        subscription_expires_at: tenant.subscription_expires_at ?? null,
        days_until_expiry: getDaysUntilExpiry(tenant.subscription_expires_at),
      }, { status: 200 });
    }

    if (tenantId) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('subscription, subscription_expires_at')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
      }

      return NextResponse.json({
        subscription: getDisplaySubscription(tenant.subscription, tenant.subscription_expires_at),
        subscription_expires_at: tenant.subscription_expires_at ?? null,
        days_until_expiry: getDaysUntilExpiry(tenant.subscription_expires_at),
      }, { status: 200 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
