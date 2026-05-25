import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSubscription, type SubscriptionTier } from "@/lib/subscription-limits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SUBSCRIPTION_TIERS: SubscriptionTier[] = ["ENTERPRISE", "STANDARD", "BASIC"];

type CompletedElectionPeriod = "year" | "month" | "week" | "day";

const COMPLETED_ELECTION_PERIODS: CompletedElectionPeriod[] = [
  "year",
  "month",
  "week",
  "day",
];

function parseCompletedElectionPeriod(value: string | null): CompletedElectionPeriod {
  const normalized = (value ?? "month").toLowerCase();
  if (COMPLETED_ELECTION_PERIODS.includes(normalized as CompletedElectionPeriod)) {
    return normalized as CompletedElectionPeriod;
  }
  return "month";
}

function getPeriodStart(period: CompletedElectionPeriod): string {
  const now = new Date();

  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }

  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return new Date(now.getFullYear(), 0, 1).toISOString();
}

function isActiveTenant(status: string | null | undefined, isVerified: boolean | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "APPROVED" || isVerified === true;
}

function isPendingTenantApproval(
  status: string | null | undefined,
  isVerified: boolean | null | undefined
): boolean {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "REJECTED") return false;
  return !isActiveTenant(status, isVerified);
}

async function countCompletedElections(period: CompletedElectionPeriod): Promise<number> {
  const { count, error } = await supabase
    .from("election")
    .select("*", { count: "exact", head: true })
    .eq("status", "COMPLETED")
    .gte("endDate", getPeriodStart(period));

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const completedElectionsPeriod = parseCompletedElectionPeriod(
      searchParams.get("period")
    );

    const [{ data: tenants, error: tenantsError }, completedElections] = await Promise.all([
      supabase.from("tenants").select("id, subscription, status, is_verified"),
      countCompletedElections(completedElectionsPeriod),
    ]);

    if (tenantsError) {
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    const subscriptionBreakdown: Record<SubscriptionTier, number> = {
      ENTERPRISE: 0,
      STANDARD: 0,
      BASIC: 0,
    };

    let pendingTenantApprovals = 0;
    const tenantList = tenants ?? [];

    for (const tenant of tenantList) {
      const tier = normalizeSubscription(tenant.subscription);
      subscriptionBreakdown[tier] += 1;
      if (isPendingTenantApproval(tenant.status, tenant.is_verified)) {
        pendingTenantApprovals += 1;
      }
    }

    const totalTenants = tenantList.length;

    return NextResponse.json(
      {
        subscriptionBreakdown,
        subscriptionTiers: SUBSCRIPTION_TIERS,
        totalTenants,
        pendingTenantApprovals,
        completedElections,
        completedElectionsPeriod,
        statsAsOf: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
