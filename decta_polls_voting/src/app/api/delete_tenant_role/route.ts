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
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    // 1. Remove role assignments from userRoles
    await supabase.from("userRoles").delete().eq("roleID", roleId);

    // 2. Remove roleID from any pending/historical tenant invitations
    await supabase.from("tenant invitations").update({ roleID: null }).eq("roleID", roleId);

    // 3. Delete the role itself
    const { error: deleteError } = await supabase
      .from("tenant roles")
      .delete()
      .eq("id", roleId);

    if (deleteError) {
      console.error("[delete_tenant_role] Supabase delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Role deleted successfully",
    });
  } catch (err: any) {
    console.error("[delete_tenant_role] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
