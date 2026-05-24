import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSubscription, type SubscriptionTier } from "@/lib/subscription-limits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SUBSCRIPTION_TIERS: SubscriptionTier[] = ["ENTERPRISE", "STANDARD", "BASIC"];

function isActiveTenant(status: string | null | undefined, isVerified: boolean | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "APPROVED" || isVerified === true;
}

async function countBallotsCast(): Promise<number> {
  const { count, error } = await supabase
    .from("vote_tokens")
    .select("*", { count: "exact", head: true })
    .eq("used", true);

  if (!error && count !== null) {
    return count;
  }

  const { count: voterCount, error: voterError } = await supabase
    .from("tenant users")
    .select("*", { count: "exact", head: true })
    .ilike("user_type", "voter");

  if (!voterError && voterCount !== null) {
    return voterCount;
  }

  return 0;
}

export async function GET() {
  try {
    const [{ data: tenants, error: tenantsError }, totalBallotsCast] = await Promise.all([
      supabase.from("tenants").select("id, subscription, status, is_verified"),
      countBallotsCast(),
    ]);

    if (tenantsError) {
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    const subscriptionBreakdown: Record<SubscriptionTier, number> = {
      ENTERPRISE: 0,
      STANDARD: 0,
      BASIC: 0,
    };

    let activeTenantCount = 0;
    const tenantList = tenants ?? [];

    for (const tenant of tenantList) {
      const tier = normalizeSubscription(tenant.subscription);
      subscriptionBreakdown[tier] += 1;
      if (isActiveTenant(tenant.status, tenant.is_verified)) {
        activeTenantCount += 1;
      }
    }

    const totalTenants = tenantList.length;
    const activeTenantRate =
      totalTenants > 0 ? Math.round((activeTenantCount / totalTenants) * 10000) / 100 : 0;

    return NextResponse.json(
      {
        subscriptionBreakdown,
        subscriptionTiers: SUBSCRIPTION_TIERS,
        totalTenants,
        activeTenantCount,
        activeTenantRate,
        totalBallotsCast,
        ballotsAsOf: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
