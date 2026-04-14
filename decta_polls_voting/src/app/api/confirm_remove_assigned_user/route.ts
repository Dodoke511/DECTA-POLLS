import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // 1. Look up the pending removal record
    const { data: record, error: fetchError } = await supabase
      .from("removal confirmations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: "Invalid or already-used confirmation link." },
        { status: 404 }
      );
    }

    // 2. Check expiry
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This confirmation link has expired. Please ask the administrator to resend the request." },
        { status: 410 }
      );
    }

    // 3. Remove the role assignment
    const { error: updateError } = await supabase
      .from("tenant users")
      .update({ roleID: null })
      .eq("roleID", record.role_id)
      .eq("email", record.email);

    if (updateError) {
      console.error("[confirm_remove] Supabase update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Mark the confirmation record as used
    await supabase
      .from("removal confirmations")
      .update({ status: "confirmed" })
      .eq("token", token);

    return NextResponse.json({
      success: true,
      organization: record.organization,
      roleName: record.role_name,
    });
  } catch (err: any) {
    console.error("[confirm_remove] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
