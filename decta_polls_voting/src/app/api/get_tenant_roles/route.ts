import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to identify the tenant" },
        { status: 400 }
      );
    }

    // 1. Fetch tenant ID
    const { data: tenant, error: fetchError } = await supabase
      .from("tenants")
      .select("id")
      .eq("email", email)
      .single();

    if (fetchError || !tenant) {
      console.error("[get_tenant_roles] Error fetching tenant:", fetchError);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 2. Fetch roles for this tenant
    const { data: roles, error: rolesError } = await supabase
      .from("tenant roles")
      .select("*")
      .eq("tenantID", tenant.id);

    if (rolesError) {
      console.error("[get_tenant_roles] Supabase error:", rolesError);
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // 3. Fetch tenant users to get assigned person emails
    const { data: tenantUsers } = await supabase
      .from("tenant users")
      .select("roleID, email")
      .eq("tenantID", tenant.id);

    // 4. Map assigned email onto each role
    const rolesWithAssignee = (roles ?? []).map((role: any) => {
      const assignedUser = (tenantUsers ?? []).find(
        (u: any) => u.roleID === role.id
      );
      return {
        ...role,
        assignedEmail: assignedUser?.email ?? null,
      };
    });

    return NextResponse.json({
      data: rolesWithAssignee,
    });
  } catch (err: any) {
    console.error("[get_tenant_roles] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
