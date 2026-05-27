// src/app/api/elections/retention/check/route.ts

import { NextResponse } from "next/server";
import { isElectionExpired, deleteElectionCascade } from "@/lib/server/retention";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/**
 * GET /api/elections/retention/check
 * Returns a list of elections for the current tenant that have passed the retention period.
 * The tenant ID is expected in the query string: ?tenantId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  // Get retention setting (fallback to 30 days)
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
    .select("id, title, endDate")
    .eq("tenantID", tenantId)
    .in("status", ["COMPLETED", "FAILED"])
    .not("endDate", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const expired: any[] = [];

  for (const e of elections || []) {
    const electionEnd = new Date(e.endDate);
    
    // expiryDate = endDate + retentionDays
    const expiryDate = new Date(electionEnd.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    // hardDeleteDate = expiryDate + 24 hours
    const hardDeleteDate = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);

    if (now >= hardDeleteDate) {
      // Auto-delete because 24 hours have passed since it expired
      try {
        console.log(`[Auto-Retention] Auto-deleting expired election ${e.id} (${e.title})`);
        await deleteElectionCascade(e.id, tenantId);
      } catch (err) {
        console.error(`[Auto-Retention] Failed to auto-delete election ${e.id}:`, err);
      }
    } else if (now >= expiryDate) {
      // It is within the 24-hour notice window
      const remainingMs = hardDeleteDate.getTime() - now.getTime();
      const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
      
      expired.push({
        id: e.id,
        title: e.title,
        endDate: e.endDate,
        completed_at: e.endDate, // for backward compatibility with page.tsx rendering
        remainingHours,
      });
    }
  }

  return NextResponse.json({ expired });
}
