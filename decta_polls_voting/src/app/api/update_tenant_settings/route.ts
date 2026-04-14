import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email, // Used as the identifier for the tenant
      brandingColorPrimary,
      brandingColorSecondary,
      registrationMode,
      activeTriggers,
      allowSubstitution,
      allowWithdrawal,
      logoUrl, 
    } = body;

    console.log("[update_tenant_settings] Received payload for:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to identify the tenant" },
        { status: 400 }
      );
    }

    // Prepare the update payload using ONLY the actual columns present in the 'tenants' table
    const updates: any = {};
    if (brandingColorPrimary !== undefined) updates.main_color = brandingColorPrimary;
    if (brandingColorSecondary !== undefined) updates.secondary_color = brandingColorSecondary;
    if (logoUrl !== undefined) updates.logo_url = logoUrl;
    
    // Note: registrationMode, activeTriggers, allowSubstitution, allowWithdrawal 
    // are NOT in your DB schema yet, so we cannot save them right now without 
    // crashing the API.

    // Update the 'tenants' table matching the email identifier
    const { data, error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("email", email)
      .select()
      .single();

    if (error) {
      console.error("[update_tenant_settings] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Tenant settings updated successfully",
      data,
    });
  } catch (err: any) {
    console.error("[update_tenant_settings] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
