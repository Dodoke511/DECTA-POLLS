import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

    const { data, error } = await supabase
      .from("tenants")
      .select("organization, email, type, logo_url, main_color, secondary_color, subscription")
      .eq("email", email)
      .single();

    console.log('[get_tenant_info] Query result:', { data, error });

    if (error) {
      console.error("[get_tenant_info] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.warn('[get_tenant_info] No tenant found for email:', email);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("[get_tenant_info] API error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
