import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getDisplaySubscription } from '@/lib/subscription-limits';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    console.log('[get_tenant_info] Received email:', email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the tenant user to get the tenantID
    const { data: userData, error: userError } = await supabase
      .from("tenant users")
      .select("tenantID")
      .ilike("email", email.trim())
      .single();

    if (userError || !userData) {
      console.warn('[get_tenant_info] No tenant user found for email:', email);
      return NextResponse.json({ error: "Tenant user not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("tenants")
      .select("id, organization, email, type, logo_url, main_color, secondary_color, third_color, subscription, slug, created_at, subscription_expires_at, active_triggers, status, is_verified")
      .eq("id", userData.tenantID)
      .single();

    console.log('[get_tenant_info] Query result:', { data, error });

    if (error) {
      console.error("[get_tenant_info] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.warn('[get_tenant_info] No tenant found for ID:', userData.tenantID);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const subscriptionState = getDisplaySubscription(data.subscription, data.subscription_expires_at);
    if (subscriptionState === 'EXPIRED' && data.subscription !== 'EXPIRED') {
      await supabase
        .from('tenants')
        .update({ subscription: 'EXPIRED' })
        .eq('id', data.id);
    }

    // Fetch the registration mode from the election table
    const { data: electionData } = await supabase
      .from("election")
      .select("voterMode")
      .eq("tenantID", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (electionData && electionData.voterMode) {
      (data as any).registration_mode = electionData.voterMode;
    }

    return NextResponse.json({
      data: {
        ...data,
        subscription: subscriptionState,
        status: data.status ?? "APPROVED",
        is_verified: data.is_verified ?? false,
      },
    });
  } catch (err: any) {
    console.error("[get_tenant_info] API error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
