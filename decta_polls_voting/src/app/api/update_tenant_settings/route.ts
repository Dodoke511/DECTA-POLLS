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
      newEmail,
      newPassword,
      tenantSlug,
      organizationName,
      brandingColorPrimary,
      brandingColorSecondary,
      brandingColorThird,
      activeTriggers,
      allowSubstitution,
      allowWithdrawal,
      logoUrl, 
      subscriptionPlan,
      isSubscriptionRenewed,
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
    if (tenantSlug !== undefined) updates.slug = tenantSlug;
    if (organizationName !== undefined) updates.organization = organizationName;
    if (brandingColorPrimary !== undefined) updates.main_color = brandingColorPrimary;
    if (brandingColorSecondary !== undefined) updates.secondary_color = brandingColorSecondary;
    if (brandingColorThird !== undefined) updates.third_color = brandingColorThird;
    if (logoUrl !== undefined) updates.logo_url = logoUrl;
    if (subscriptionPlan !== undefined) updates.subscription = subscriptionPlan;
    if (activeTriggers !== undefined) updates.active_triggers = activeTriggers;
    if (isSubscriptionRenewed) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        updates.subscription_expires_at = expiresAt.toISOString();
    }
    
    // Find the tenant using the admin's email
    const { data: adminData, error: adminError } = await supabase
      .from("tenant users")
      .select("tenantID, id")
      .ilike("email", email.trim())
      .single();

    if (adminError || !adminData) {
      console.error("[update_tenant_settings] Admin user not found:", adminError);
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Update the 'tenants' table matching the tenantID
    const { data, error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", adminData.tenantID)
      .select()
      .single();

    if (error) {
      console.error("[update_tenant_settings] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }


    // Update the email in tenant users and auth.users if newEmail was provided
    if (newEmail !== undefined && adminData?.id) {
      // 1. Update auth.users table FIRST
      const { error: authEmailError } = await supabase.auth.admin.updateUserById(adminData.id, {
        email: newEmail,
        email_confirm: true
      });

      if (authEmailError) {
        console.error("[update_tenant_settings] Auth email update error:", authEmailError);
        let errorMessage = authEmailError.message;
        if (errorMessage === "Error updating user") {
            errorMessage = "This email is already registered to another account.";
        }
        return NextResponse.json({ error: "Failed to update login email: " + errorMessage }, { status: 400 });
      }

      // 2. If auth update succeeds, update tenant users table
      const { error: userError } = await supabase
        .from('tenant users')
        .update({ email: newEmail })
        .eq('id', adminData.id);

      if (userError) {
        console.error("[update_tenant_settings] Error updating tenant users table:", userError);
      }
    }

    // Update the password in auth.users if newPassword was provided
    if (newPassword && adminData?.id) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(adminData.id, {
        password: newPassword
      });
      if (passwordError) {
        console.error("[update_tenant_settings] Password update error:", passwordError);
        return NextResponse.json({ error: passwordError.message }, { status: 500 });
      }
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
