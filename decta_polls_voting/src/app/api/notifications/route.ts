import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function GET(request: Request) {
  try {
    // 1. Resolve Auth Token
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.replace("Bearer ", "");

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("sb-access-token")?.value;
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Resolve user type and tenant from tenant users using admin client
    const { data: tenantUser, error: dbError } = await supabaseAdmin
      .from("tenant users")
      .select("tenantID, user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError || !tenantUser) {
      return NextResponse.json({ error: "Tenant user not resolved" }, { status: 403 });
    }

    const userType = tenantUser.user_type?.toLowerCase();
    const isTenantAdmin = ["admin", "sub-admin"].includes(userType);
    const isCandidate = userType === "candidate";
    const isVoter = userType === "voter";

    // 4. Query notifications
    let roleFilter = ["all"];
    if (isTenantAdmin) {
      roleFilter = ["tenant_admin"];
    } else if (isCandidate) {
      roleFilter.push("candidate");
    } else if (isVoter) {
      roleFilter.push("voter");
    }

    const { searchParams } = new URL(request.url);
    const electionIdParam = searchParams.get("electionId");

    let dbQuery = supabaseAdmin
      .from("notifications")
      .select(`
        id,
        title,
        message,
        type,
        created_at,
        election_id,
        election(title)
      `)
      .eq("tenant_id", tenantUser.tenantID)
      .in("role_type", roleFilter)
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (electionIdParam) {
      dbQuery = dbQuery.eq("election_id", electionIdParam);
    }

    const { data: notifications, error: notifError } = await dbQuery
      .order("created_at", { ascending: false });

    if (notifError) {
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    // 5. Fetch read notifications for this user
    const { data: reads } = await supabaseAdmin
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id);

    const readIds = new Set(reads?.map((r) => r.notification_id) || []);

    const result = notifications.map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      createdAt: notif.created_at,
      electionTitle: notif.election?.title || null,
      isRead: readIds.has(notif.id),
    }));

    return NextResponse.json({ notifications: result });
  } catch (err: any) {
    console.error("[Notifications API] GET Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.replace("Bearer ", "");

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("sb-access-token")?.value;
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Fetch all eligible notification IDs for this user
      const { data: tenantUser } = await supabaseAdmin
        .from("tenant users")
        .select("tenantID, user_type")
        .eq("id", user.id)
        .single();

      if (!tenantUser) {
        return NextResponse.json({ error: "User not resolved" }, { status: 404 });
      }

      const userType = tenantUser.user_type?.toLowerCase();
      let roleFilter = ["all"];
      if (["admin", "sub-admin"].includes(userType)) {
        roleFilter = ["tenant_admin"];
      } else if (userType === "candidate") {
        roleFilter.push("candidate");
      } else if (userType === "voter") {
        roleFilter.push("voter");
      }

      const { data: notifications } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("tenant_id", tenantUser.tenantID)
        .in("role_type", roleFilter)
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (notifications && notifications.length > 0) {
        const insertRows = notifications.map((n) => ({
          notification_id: n.id,
          user_id: user.id,
        }));

        await supabaseAdmin.from("notification_reads").upsert(insertRows, {
          onConflict: "notification_id,user_id",
        });
      }
    } else if (notificationId) {
      await supabaseAdmin.from("notification_reads").upsert({
        notification_id: notificationId,
        user_id: user.id,
      }, {
        onConflict: "notification_id,user_id",
      });
    } else {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Notifications API] POST Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
