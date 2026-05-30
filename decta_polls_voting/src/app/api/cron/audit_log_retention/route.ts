import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteExpiredAuditLogs } from "@/lib/server/retention";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(request: Request) {
  try {
    await deleteExpiredAuditLogs();
    return NextResponse.json({ message: "Expired audit logs removed successfully" });
  } catch (err: any) {
    console.error("[audit_log_retention] Error deleting expired audit logs:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
