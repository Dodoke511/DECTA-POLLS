import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, electionId, title, message } = body;

    if (!tenantId || !title || !message) {
      return NextResponse.json({ error: 'tenantId, title and message are required' }, { status: 400 });
    }

    // Ensure tenant exists (best-effort)
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const insert = {
      tenant_id: tenantId,
      election_id: electionId || null,
      user_id: null,
      role_type: 'tenant_admin',
      title: title,
      message: message,
      type: 'retention_warning',
    };

    const { error } = await supabaseAdmin.from('notifications').insert(insert);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
