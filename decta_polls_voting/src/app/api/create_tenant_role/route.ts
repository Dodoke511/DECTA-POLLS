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
    const { tenantEmail, roleName, permissions, roleDescription } = body;

    console.log("[create_tenant_role] Received payload:", { tenantEmail, roleName, permissions_count: permissions?.length });

    if (!tenantEmail || !roleName || !permissions) {
      return NextResponse.json(
        { error: "tenantEmail, roleName, and permissions are required" },
        { status: 400 }
      );
    }

    // 1. Get the actual tenant UUID using the email identifier
    const { data: tenant, error: fetchError } = await supabase
      .from("tenants")
      .select("id")
      .eq("email", tenantEmail)
      .single();

    if (fetchError || !tenant) {
      console.error("[create_tenant_role] Error fetching tenant:", fetchError);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 2. Insert the new role mapping to this tenant ID
    const { data: newRole, error: insertError } = await supabase
      .from("tenant roles")
      .insert([
        {
          tenantID: tenant.id,
          roleName: roleName,
          permissions: permissions,
          roleDescription: roleDescription ?? null,
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("[create_tenant_role] Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Role created successfully",
      data: newRole,
    });
  } catch (err: any) {
    console.error("[create_tenant_role] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
