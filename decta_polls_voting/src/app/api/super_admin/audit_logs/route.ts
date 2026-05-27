import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuditLogRow = {
  id: string;
  created_at: string | null;
  tenantID: string | null;
  actorID: string | null;
  actionType: string;
};

type TenantUserRow = {
  id: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
};

type ElectionRow = {
  id: string;
  tenantID: string | null;
  status: string;
  created_at: string | null;
  startDate: string | null;
  endDate: string | null;
};

type MonitoringLog = {
  id: string;
  timestamp: string;
  tenant: string;
  action: string;
  performedBy: string;
  sortAt: string;
};

const SYSTEM_PERFORMED_BY = "System";

const AUDIT_TABLE_CANDIDATES = ["audit_logs", "audit logs"] as const;
const ELECTION_MONITORING_STATUSES = ["ACTIVE", "COMPLETED"] as const;

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatPerformedBy(user: TenantUserRow): string {
  const fullName = `${user.first_name ?? ""} ${user.surname ?? ""}`.trim();
  if (fullName) return fullName;
  if (user.email?.trim()) return user.email.trim();
  return "Unknown User";
}

function formatActionType(actionType: string): string {
  return actionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function electionActionLabel(status: string): string | null {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "Active Election";
  if (normalized === "COMPLETED") return "Completed Election";
  return null;
}

function electionSortTimestamp(row: ElectionRow): string {
  const normalized = row.status.toUpperCase();
  if (normalized === "COMPLETED" && row.endDate) return row.endDate;
  if (normalized === "ACTIVE" && row.startDate) return row.startDate;
  return row.created_at ?? new Date(0).toISOString();
}

async function fetchElectionRows(client: SupabaseClient): Promise<ElectionRow[]> {
  const { data, error } = await client
    .from("election")
    .select("id, tenantID, status, created_at, startDate, endDate")
    .in("status", [...ELECTION_MONITORING_STATUSES])
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ElectionRow[];
}

async function fetchTenantNames(
  client: SupabaseClient,
  tenantIds: string[]
): Promise<Map<string, string>> {
  const tenantNameById = new Map<string, string>();
  if (tenantIds.length === 0) return tenantNameById;

  const { data: tenants, error: tenantsError } = await client
    .from("tenants")
    .select("id, organization")
    .in("id", tenantIds);

  if (tenantsError) {
    throw new Error(tenantsError.message);
  }

  for (const tenant of tenants ?? []) {
    const name =
      typeof tenant.organization === "string" && tenant.organization.trim()
        ? tenant.organization.trim()
        : "Unknown Tenant";
    tenantNameById.set(tenant.id, name);
  }

  return tenantNameById;
}

async function fetchPerformedByLabels(
  client: SupabaseClient,
  actorIds: string[]
): Promise<Map<string, string>> {
  const performedByById = new Map<string, string>();
  if (actorIds.length === 0) return performedByById;

  const { data: users, error: usersError } = await client
    .from("tenant users")
    .select("id, first_name, surname, email")
    .in("id", actorIds);

  if (usersError) {
    throw new Error(usersError.message);
  }

  for (const user of (users ?? []) as TenantUserRow[]) {
    performedByById.set(user.id, formatPerformedBy(user));
  }

  return performedByById;
}

async function fetchAuditLogRows(client: SupabaseClient): Promise<{
  rows: AuditLogRow[];
  tableName: string;
}> {
  let lastError: { message: string } | null = null;

  for (const tableName of AUDIT_TABLE_CANDIDATES) {
    const { data, error } = await client
      .from(tableName)
      .select("id, created_at, tenantID, actorID, actionType")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) {
      return { rows: (data ?? []) as AuditLogRow[], tableName };
    }
    lastError = error;
  }

  throw new Error(lastError?.message ?? "Failed to fetch audit logs");
}

export async function GET() {
  try {
    const [{ rows: auditRows }, electionRows] = await Promise.all([
      fetchAuditLogRows(supabase),
      fetchElectionRows(supabase),
    ]);

    const tenantIds = Array.from(
      new Set([
        ...auditRows.map((r) => r.tenantID),
        ...electionRows.map((r) => r.tenantID),
      ].filter((id): id is string => Boolean(id)))
    );

    const actorIds = Array.from(
      new Set(auditRows.map((r) => r.actorID).filter((id): id is string => Boolean(id)))
    );

    const [tenantNameById, performedByById] = await Promise.all([
      fetchTenantNames(supabase, tenantIds),
      fetchPerformedByLabels(supabase, actorIds),
    ]);

    const auditLogs: MonitoringLog[] = auditRows.map((row) => ({
      id: row.id,
      timestamp: formatTimestamp(row.created_at),
      tenant: row.tenantID
        ? (tenantNameById.get(row.tenantID) ?? "Unknown Tenant")
        : "—",
      action: formatActionType(row.actionType),
      performedBy: row.actorID
        ? (performedByById.get(row.actorID) ?? "Unknown User")
        : SYSTEM_PERFORMED_BY,
      sortAt: row.created_at ?? new Date(0).toISOString(),
    }));

    const electionLogs: MonitoringLog[] = electionRows
      .map((row) => {
        const action = electionActionLabel(row.status);
        if (!action) return null;

        const sortAt = electionSortTimestamp(row);

        return {
          id: `election-${row.id}`,
          timestamp: formatTimestamp(sortAt),
          tenant: row.tenantID
            ? (tenantNameById.get(row.tenantID) ?? "Unknown Tenant")
            : "—",
          action,
          performedBy: SYSTEM_PERFORMED_BY,
          sortAt,
        };
      })
      .filter((row): row is MonitoringLog => row !== null);

    const logs = [...auditLogs, ...electionLogs]
      .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
      .map(({ sortAt: _sortAt, ...log }) => log);

    return NextResponse.json({ logs }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
