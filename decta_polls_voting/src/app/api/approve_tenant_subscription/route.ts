import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { SubscriptionTier } from "@/lib/subscription-limits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_TIERS: SubscriptionTier[] = ["BASIC", "STANDARD", "ENTERPRISE"];

type Body = {
  tenantId?: string;
  subscriptionTier?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const tenantId = body.tenantId?.trim() ?? "";
  const subscriptionTier = (body.subscriptionTier ?? "").trim().toUpperCase();

  if (!tenantId) {
    return new Response(
      JSON.stringify({ message: "Missing tenant id." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (!VALID_TIERS.includes(subscriptionTier as SubscriptionTier)) {
    return new Response(
      JSON.stringify({ message: "Invalid subscription tier." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { error: updateError } = await supabase
    .from("tenants")
    .update({
      subscription: subscriptionTier,
      status: "APPROVED",
      is_verified: true,
    })
    .eq("id", tenantId);

  if (updateError) {
    return new Response(
      JSON.stringify({ message: "Failed to approve tenant subscription." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ message: "Tenant subscription approved." }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
