import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // 1. Fetch roles for this tenant
    const { data: roles, error: rolesError } = await supabase
      .from("tenant roles")
      .select("*")
      .eq("tenantID", tenantId);

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // 2. Fetch tenant users to get assigned person emails
    const { data: tenantUsers } = await supabase
      .from("tenant users")
      .select("roleID, email")
      .eq("tenantID", tenantId);

    // 3. Map assigned email onto each role
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
      roles: rolesWithAssignee,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to identify the tenant" },
        { status: 400 }
      );
    }

    // 1. Fetch tenant ID via tenant users
    const { data: adminData, error: adminError } = await supabase
      .from("tenant users")
      .select("tenantID")
      .ilike("email", email.trim())
      .single();

    if (adminError || !adminData) {
      console.error("[get_tenant_roles] Admin user not found:", adminError);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = adminData.tenantID;

    // 2. Fetch roles for this tenant
    const { data: roles, error: rolesError } = await supabase
      .from("tenant roles")
      .select("*")
      .eq("tenantID", tenantId);

    if (rolesError) {
      console.error("[get_tenant_roles] Supabase error:", rolesError);
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // 3. Fetch tenant users for this tenant to know their emails
    const { data: tenantUsers } = await supabase
      .from("tenant users")
      .select("id, email")
      .eq("tenantID", tenantId);
      
    const userIds = (tenantUsers ?? []).map((u: any) => u.id);

    // 4. Fetch userRoles for those users
    const { data: userRoles } = userIds.length > 0 
      ? await supabase.from("userRoles").select("roleID, userID").in("userID", userIds) 
      : { data: [] };

    // 5. Map assigned email onto each role
    const rolesWithAssignee = (roles ?? []).map((role: any) => {
      const assignedUserRole = (userRoles ?? []).find(
        (ur: any) => ur.roleID === role.id
      );
      const assignedUser = (tenantUsers ?? []).find(
        (u: any) => u.id === assignedUserRole?.userID
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
