import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

export async function POST() {
  const { error } = await supabaseAdmin
    .schema("information_schema")
    .from("tables")
    .select("table_name")
    .limit(1);

  if (error) {
    return new Response(
      JSON.stringify({
        message: "Database connection failed",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ message: "Database connection successful" }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}