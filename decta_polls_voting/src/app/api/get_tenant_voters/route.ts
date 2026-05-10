import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const TEMPORARY_VOTER_PASSWORD = "12345";

interface VoterAuthSync {
  id: string;
  email?: string | null;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Internal Server Error";
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error("[get_tenant_voters] Auth list error:", error);
    return null;
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  ) || null;
}

async function ensureVoterAuthAccount(voter: VoterAuthSync, tenantId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !voter.email) return;

  let authUser = await findAuthUserByEmail(voter.email);

  if (!authUser) {
    const { data: createdAuthUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: voter.email,
        password: TEMPORARY_VOTER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role_type: "Voter",
          temporary_password: true,
        },
      });

    if (createError || !createdAuthUser.user) {
      console.error("[get_tenant_voters] Auth create error:", {
        email: voter.email,
        error: createError?.message,
      });
      return;
    }

    authUser = createdAuthUser.user;
  }

  if (authUser.id !== voter.id) {
    const { error: updateError } = await supabase
      .from("tenant users")
      .update({ id: authUser.id, user_type: "Voter" })
      .eq("id", voter.id)
      .eq("tenantID", tenantId);

    if (updateError) {
      console.error("[get_tenant_voters] Tenant voter auth id sync error:", {
        email: voter.email,
        error: updateError.message,
      });
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Fetch voters from tenant_users table where user_type is voter
    const { data: voters, error } = await supabase
      .from("tenant users")
      .select("*")
      .eq("tenantID", tenantId)
      .in("user_type", ["voter", "Voter"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[get_tenant_voters] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await Promise.all(
      (voters || []).map((voter) => ensureVoterAuthAccount(voter, tenantId))
    );

    const { data: syncedVoters, error: syncedError } = await supabase
      .from("tenant users")
      .select("*")
      .eq("tenantID", tenantId)
      .in("user_type", ["voter", "Voter"])
      .order("created_at", { ascending: false });

    if (syncedError) {
      console.error("[get_tenant_voters] Supabase refetch error:", syncedError);
      return NextResponse.json({ error: syncedError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: syncedVoters || [],
      count: syncedVoters?.length || 0,
    });
  } catch (err: unknown) {
    console.error("[get_tenant_voters] API error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
