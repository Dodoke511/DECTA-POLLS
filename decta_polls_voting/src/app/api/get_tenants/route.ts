import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const sortBy = searchParams.get("sortBy");

    let query = supabase.from("tenants").select("*");

    if (activeOnly) {
      query = query.or("status.eq.APPROVED,is_verified.eq.true");
    }

    if (sortBy === "elections") {
      const { data: elections, error: electionsError } = await supabase
        .from("election")
        .select("tenantID");

      if (electionsError) {
        return NextResponse.json({ error: electionsError.message }, { status: 500 });
      }

      const countByTenant = new Map<string, number>();
      for (const row of elections ?? []) {
        if (!row.tenantID) continue;
        countByTenant.set(row.tenantID, (countByTenant.get(row.tenantID) ?? 0) + 1);
      }

      const { data: allTenants, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const sorted = (allTenants ?? [])
        .sort((a, b) => (countByTenant.get(b.id) ?? 0) - (countByTenant.get(a.id) ?? 0))
        .slice(0, limit);

      return NextResponse.json({ data: sorted });
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
