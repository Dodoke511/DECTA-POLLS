// src/app/api/elections/retention/delete/route.ts

import { NextResponse } from "next/server";
import { deleteElectionCascade } from "@/lib/server/retention";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/**
 * POST /api/elections/retention/delete
 * Body: { tenantId: string, electionId: string }
 * Performs a transactional cascade delete of the election and related data.
 * Returns success or error JSON.
 */
export async function POST(request: Request) {
  let payload: { tenantId?: string; electionId?: string };
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { tenantId, electionId } = payload;
  if (!tenantId || !electionId) {
    return NextResponse.json({ error: "tenantId and electionId are required" }, { status: 400 });
  }

  try {
    // Ensure the election belongs to the tenant and is eligible for deletion
    // The deleteElectionCascade function will perform the checks and deletion.
    await deleteElectionCascade(electionId, tenantId);
    return NextResponse.json({ success: true, message: "Election deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("Retention deletion error:", err);
    return NextResponse.json({ error: err.message || "Deletion failed" }, { status: 500 });
  }
}
