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
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Fetch voters from tenant_users table where user_type is 'voter'
    const { data: voters, error } = await supabase
      .from("tenant users")
      .select("*")
      .eq("tenantID", tenantId)
      .eq("user_type", "voter")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[get_tenant_voters] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return empty array if no voters found
    return NextResponse.json({
      data: voters || [],
      count: voters?.length || 0,
    });
  } catch (err: any) {
    console.error("[get_tenant_voters] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
