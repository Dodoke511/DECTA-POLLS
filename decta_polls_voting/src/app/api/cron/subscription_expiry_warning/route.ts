import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDaysUntilExpiry } from '@/lib/subscription-limits';
import { triggerSubscriptionExpiryWarning } from '@/lib/server/notifications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const now = new Date();
    const lowerBound = now.toISOString();
    const upperBound = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, subscription_expires_at')
      .not('subscription_expires_at', 'is', null)
      .gt('subscription_expires_at', lowerBound)
      .lte('subscription_expires_at', upperBound)
      .neq('subscription', 'EXPIRED');

    if (error) {
      console.error('[Subscription Expiry Warning] Failed to fetch tenants:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const processed: string[] = [];
    const skipped: string[] = [];

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants currently within the 10-day expiry window.' }, { status: 200 });
    }

    for (const tenant of tenants as any[]) {
      if (!tenant.subscription_expires_at) {
        skipped.push(tenant.id);
        continue;
      }

      const daysUntilExpiry = getDaysUntilExpiry(tenant.subscription_expires_at);
      if (daysUntilExpiry === null || daysUntilExpiry <= 0 || daysUntilExpiry > 10) {
        skipped.push(tenant.id);
        continue;
      }

      const { data: existingNotifications, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('type', 'subscription_expiry_warning')
        .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existingError) {
        console.error('[Subscription Expiry Warning] Failed to query existing notifications for tenant:', tenant.id, existingError);
        skipped.push(tenant.id);
        continue;
      }

      if (existingNotifications && existingNotifications.length > 0) {
        skipped.push(tenant.id);
        continue;
      }

      await triggerSubscriptionExpiryWarning(tenant.id, tenant.subscription_expires_at);
      processed.push(tenant.id);
    }

    return NextResponse.json({
      message: 'Subscription expiry warning process completed.',
      processed,
      skipped,
    }, { status: 200 });
  } catch (err: any) {
    console.error('[Subscription Expiry Warning] Cron error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
