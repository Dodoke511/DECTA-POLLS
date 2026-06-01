import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseRetentionSetting } from "@/lib/server/retention";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function GET() {
  try {
    const { data: retentionRow, error: retentionError } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "retention")
      .maybeSingle();

    if (retentionError) {
      throw retentionError;
    }

    const retention = parseRetentionSetting(retentionRow?.value);

    const { data: elections, error: electionError } = await supabaseAdmin
      .from("election")
      .select("id,title,tenantID,status,endDate")
      .in("status", ["COMPLETED", "FAILED"])
      .not("endDate", "is", null)
      .order("endDate", { ascending: true });

    if (electionError) {
      throw electionError;
    }

    const rows: any[] = elections ?? [];
    const tenantIds = Array.from(new Set(rows.map((row) => row.tenantID).filter(Boolean)));

    const tenantNames = new Map<string, string>();
    if (tenantIds.length > 0) {
      const { data: tenants, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("id, organization")
        .in("id", tenantIds);

      if (tenantError) {
        throw tenantError;
      }

      for (const tenant of tenants ?? []) {
        if (tenant?.id) {
          tenantNames.set(
            tenant.id,
            typeof tenant.organization === "string" && tenant.organization.trim()
              ? tenant.organization.trim()
              : "Unknown Tenant"
          );
        }
      }
    }

    const now = new Date();
    const expiring: any[] = [];
    const deletable: any[] = [];

    for (const row of rows) {
      if (!row.endDate) continue;
      const endDate = new Date(row.endDate);
      const expiryDate = new Date(endDate.getTime() + retention.election_data_days * 24 * 60 * 60 * 1000);
      const hardDeleteDate = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);

      if (now >= hardDeleteDate) {
        deletable.push({
          id: row.id,
          title: row.title ?? "Untitled Election",
          tenantId: row.tenantID,
          tenant: row.tenantID ? tenantNames.get(row.tenantID) ?? "Unknown Tenant" : "—",
          endDate: row.endDate,
          expiryDate: expiryDate.toISOString(),
          hardDeleteDate: hardDeleteDate.toISOString(),
          daysPast: Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)),
        });
      } else if (now >= expiryDate) {
        const remainingMs = hardDeleteDate.getTime() - now.getTime();
        const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
        expiring.push({
          id: row.id,
          title: row.title ?? "Untitled Election",
          tenantId: row.tenantID,
          tenant: row.tenantID ? tenantNames.get(row.tenantID) ?? "Unknown Tenant" : "—",
          endDate: row.endDate,
          expiryDate: expiryDate.toISOString(),
          hardDeleteDate: hardDeleteDate.toISOString(),
          remainingHours,
        });
      }
    }

    return NextResponse.json(
      {
        retention: {
          audit_log_days: retention.audit_log_days,
          election_data_days: retention.election_data_days,
        },
        expiring,
        deletable,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unable to load retention status." }, { status: 500 });
  }
}
