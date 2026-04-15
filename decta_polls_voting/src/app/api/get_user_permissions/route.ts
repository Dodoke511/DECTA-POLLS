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
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Check if this is a tenant owner (registered in "tenants" table)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("email", email)
      .single();

    if (tenant) {
      // Tenant owners get all permissions
      return NextResponse.json({ permissions: ["*"], role: "tenant_owner" });
    }

    // 2. Check if this is an invited tenant user
    const { data: tenantUser, error: userError } = await supabase
      .from("tenant users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !tenantUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch user's role from userRoles junction table
    const { data: userRole, error: userRoleError } = await supabase
      .from("userRoles")
      .select("roleID")
      .eq("userID", tenantUser.id)
      .single();

    if (userRoleError || !userRole || !userRole.roleID) {
      // Assigned no role — no permissions
      return NextResponse.json({ permissions: [], role: "tenant_user" });
    }

    // 3. Fetch the role's permissions
    const { data: role, error: roleError } = await supabase
      .from("tenant roles")
      .select("permissions")
      .eq("id", userRole.roleID)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      permissions: role.permissions ?? [],
      role: "tenant_user",
    });
  } catch (err: any) {
    console.error("[get_user_permissions] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
