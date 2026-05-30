// src/lib/server/retention.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

interface RetentionSettings {
  audit_log_days: number;
  election_data_days: number;
}

function parseRetentionSetting(value: unknown): RetentionSettings {
  const defaultSettings = { audit_log_days: 30, election_data_days: 30 };
  if (!value) return defaultSettings;

  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return {
    audit_log_days: Number(parsed?.audit_log_days ?? defaultSettings.audit_log_days),
    election_data_days: Number(parsed?.election_data_days ?? defaultSettings.election_data_days),
  };
}

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

  const retention = parseRetentionSetting(setting?.value);
  let retentionDays = retention.election_data_days;

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

export async function deleteExpiredAuditLogs() {
  const { data: setting } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "retention")
    .maybeSingle();

  const retention = parseRetentionSetting(setting?.value);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retention.audit_log_days);

  const { error } = await supabaseAdmin
    .from("audit_logs")
    .delete()
    .lt("created_at", cutoff.toISOString());

  if (error) {
    throw new Error(error.message);
  }
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
