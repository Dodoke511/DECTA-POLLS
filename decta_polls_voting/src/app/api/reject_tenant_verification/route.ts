import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Body = {
  tenantId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const tenantId = body.tenantId?.trim() ?? "";

  if (!tenantId) {
    return new Response(
      JSON.stringify({ message: "Missing tenant id." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { error: updateError } = await supabase
    .from("tenants")
    .update({ is_verified: false, verification: null })
    .eq("id", tenantId);

  if (updateError) {
    return new Response(
      JSON.stringify({ message: "Failed to update tenant." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ message: "Verification rejected." }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
