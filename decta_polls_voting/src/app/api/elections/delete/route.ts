// src/app/api/elections/delete/route.ts

import { NextResponse } from "next/server";
import { deleteElectionManual } from "@/lib/server/retention";

/**
 * POST /api/elections/delete
 * Body: { tenantId: string, electionId: string }
 * Performs a manual cascade delete of a DRAFT or PUBLISHED election.
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
    await deleteElectionManual(electionId, tenantId);
    return NextResponse.json({ success: true, message: "Election manually deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("Manual deletion error:", err);
    return NextResponse.json({ error: err.message || "Deletion failed" }, { status: 500 });
  }
}
