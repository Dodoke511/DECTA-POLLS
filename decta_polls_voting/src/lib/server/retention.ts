// src/lib/server/retention.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/**
 * Check if an election is older than the retention period.
 */
export function isElectionExpired(endDate: string, retentionDays: number): boolean {
  const electionEnd = new Date(endDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return electionEnd < cutoff;
}

/**
 * Delete a single election and all related data.
 * This function runs on the server (Node) side.
 */
export async function deleteElectionCascade(electionId: string, tenantId: string) {
  // Verify the election belongs to the tenant and has an endDate
  const { data: election, error: electionErr } = await supabaseAdmin
    .from("election")
    .select("id, endDate, status")
    .eq("id", electionId)
    .eq("tenantID", tenantId)
    .maybeSingle();

  if (electionErr || !election) {
    throw new Error("Election not found or access denied");
  }

  // Retrieve retention setting (default 30 days if not set)
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

  if (!election.endDate) {
    throw new Error("Election has not completed yet");
  }

  if (!["COMPLETED", "FAILED"].includes(election.status || "")) {
    throw new Error("Only completed or failed elections can be deleted by data retention");
  }

  if (!isElectionExpired(election.endDate, retentionDays)) {
    throw new Error("Election is not past retention period");
  }

  // Delete related rows – order matters for foreign keys
  await supabaseAdmin.from("notifications").delete().eq("election_id", electionId);
  await supabaseAdmin.from("notification_reads").delete().eq("notification_id", electionId);
  await supabaseAdmin.from("election_phase").delete().eq("election_id", electionId);
  await supabaseAdmin.from("results_config").delete().eq("election_id", electionId);
  await supabaseAdmin.from("voting_config").delete().eq("election_id", electionId);
  await supabaseAdmin.from("election").delete().eq("id", electionId);

  // Log the deletion for audit purposes
  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: tenantId,
    election_id: electionId,
    actor_id: tenantId,
    action_type: "election_retention_deletion",
    metadata: { reason: "retention period exceeded" },
  });
}

/**
 * Manually delete a DRAFT or PUBLISHED election.
 */
export async function deleteElectionManual(electionId: string, tenantId: string) {
  // 1. Verify the election belongs to the tenant and status is DRAFT or PUBLISHED
  const { data: election, error: electionErr } = await supabaseAdmin
    .from("election")
    .select("id, status")
    .eq("id", electionId)
    .eq("tenantID", tenantId)
    .maybeSingle();

  if (electionErr || !election) {
    throw new Error("Election not found or access denied");
  }

  if (!["DRAFT", "PUBLISHED"].includes(election.status || "")) {
    throw new Error("Only draft or published elections can be deleted manually");
  }

  // 2. Delete related rows – order matters for foreign key constraints
  await supabaseAdmin.from("notifications").delete().eq("election_id", electionId);
  await supabaseAdmin.from("notification_reads").delete().eq("notification_id", electionId);
  await supabaseAdmin.from("election_phase").delete().eq("election_id", electionId);
  await supabaseAdmin.from("results_config").delete().eq("election_id", electionId);
  await supabaseAdmin.from("voting_config").delete().eq("election_id", electionId);
  await supabaseAdmin.from("election").delete().eq("id", electionId);

  // 3. Log the deletion for audit purposes
  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: tenantId,
    election_id: electionId,
    actor_id: tenantId,
    action_type: "election_manual_deletion",
    metadata: { reason: "deleted by tenant admin", status: election.status },
  });
}
