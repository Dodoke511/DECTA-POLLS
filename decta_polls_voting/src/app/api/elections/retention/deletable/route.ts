import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/**
 * GET /api/elections/retention/deletable
 * Returns completed elections for a tenant that have exceeded retention period.
 * Query: ?tenantId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    // Get retention setting
    const { data: setting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "retention")
      .maybeSingle();

    let retentionDays = 30;
    if (setting?.value) {
      const val = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
      if (val?.election_data_days) {
        retentionDays = Number(val.election_data_days);
      }
    }

    // Fetch completed elections for this tenant
    const { data: elections, error } = await supabaseAdmin
      .from("election")
      .select("id, title, endDate, status")
      .eq("tenantID", tenantId)
      .in("status", ["COMPLETED", "FAILED"])
      .not("endDate", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const deletable: string[] = []; // election IDs that are eligible for deletion

    for (const election of elections || []) {
      if (!election.endDate) continue;
      const electionEnd = new Date(election.endDate);
      // expiryDate = endDate + retentionDays
      const expiryDate = new Date(electionEnd.getTime() + retentionDays * 24 * 60 * 60 * 1000);

      // If now >= expiryDate, this election is eligible for deletion
      if (now >= expiryDate) {
        deletable.push(election.id);
      }
    }

    return NextResponse.json({ deletable, retentionDays }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unable to check retention status." }, { status: 500 });
  }
}
