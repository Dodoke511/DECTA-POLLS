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
    const { roleId, roleName, permissions } = body;

    if (!roleId || !roleName || !permissions) {
      return NextResponse.json(
        { error: "roleId, roleName, and permissions are required" },
        { status: 400 }
      );
    }

    const { data: updatedRole, error: updateError } = await supabase
      .from("tenant roles")
      .update({
        roleName: roleName,
        permissions: permissions,
      })
      .eq("id", roleId)
      .select()
      .single();

    if (updateError) {
      console.error("[update_tenant_role] Supabase update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (err: any) {
    console.error("[update_tenant_role] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
