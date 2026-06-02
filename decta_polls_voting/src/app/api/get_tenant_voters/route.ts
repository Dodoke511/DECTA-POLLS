import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Internal Server Error";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const pageStr = searchParams.get("page") || "1";
    const limitStr = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all";

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Build query for paginated & filtered data
    let query = supabase
      .from("tenant users")
      .select("*", { count: "exact" })
      .eq("tenantID", tenantId);

    // Apply role filter (case-insensitive)
    if (role !== "all") {
      query = query.ilike("user_type", role);
    }

    // Apply search filter (case-insensitive across multiple columns)
    if (search) {
      const cleanSearch = search.trim();
      const parts = cleanSearch.split(/\s+/).filter(Boolean);
      const pattern = `%${cleanSearch}%`;
      
      let orFilter = `first_name.ilike.${pattern},middle_name.ilike.${pattern},surname.ilike.${pattern},email.ilike.${pattern},contact.ilike.${pattern},department.ilike.${pattern}`;
      
      // If user enters two words, search for first name containing part 1 and surname containing part 2
      if (parts.length >= 2) {
        const firstPart = `%${parts[0]}%`;
        const lastPart = `%${parts[parts.length - 1]}%`;
        orFilter += `,and(first_name.ilike.${firstPart},surname.ilike.${lastPart})`;
      }
      
      query = query.or(orFilter);
    }

    // Retrieve requested range ordered by creation date
    const { data: voters, error: fetchError, count: totalMatched } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error("[get_tenant_voters] Fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Fetch counts for each role under this tenant
    // To update the tab counts, retrieve just the user_type column for all tenant users.
    const { data: allUserTypes, error: countsError } = await supabase
      .from("tenant users")
      .select("user_type")
      .eq("tenantID", tenantId);

    const roleCounts = {
      all: 0,
      admin: 0,
      "sub-admin": 0,
      candidate: 0,
      voter: 0,
    };

    if (!countsError && allUserTypes) {
      roleCounts.all = allUserTypes.length;
      allUserTypes.forEach((u: any) => {
        const type = (u.user_type || "").toLowerCase();
        if (type === "admin") roleCounts.admin++;
        else if (type === "sub-admin") roleCounts["sub-admin"]++;
        else if (type === "candidate") roleCounts.candidate++;
        else if (type === "voter") roleCounts.voter++;
      });
    } else if (countsError) {
      console.error("[get_tenant_voters] Counts fetch error:", countsError);
    }

    return NextResponse.json({
      data: voters || [],
      count: totalMatched || 0,
      roleCounts,
    });
  } catch (err: unknown) {
    console.error("[get_tenant_voters] API error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
