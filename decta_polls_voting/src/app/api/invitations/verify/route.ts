import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Query invitation and join with tenants for branding
    const { data: invite, error: inviteError } = await supabase
      .from("tenant invitations")
      .select(`
        *,
        tenants (
          organization,
          logo_url,
          main_color,
          secondary_color
        )
      `)
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      console.error("[verify_invitation] Error:", inviteError);
      return NextResponse.json({ error: "Invalid or expired invitation link" }, { status: 404 });
    }

    if (invite.status !== "Pending") {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 400 });
    }

    // Check if token is older than 7 days (optional security)
    // Check if token is older than 7 days (optional security)
    if (invite.created_at) {
      const invitedAt = new Date(invite.created_at).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (!isNaN(invitedAt)) {
        if (Date.now() - invitedAt > sevenDaysInMs) {
          return NextResponse.json({ error: "This invitation link has expired" }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ 
      invitation: {
        email: invite.email,
        first_name: invite.first_name,
        surname: invite.surname,
        roleID: invite.roleID,
        tenantID: invite.tenantID
      },
      tenant: invite.tenants
    });

  } catch (err: any) {
    console.error("[verify_invitation] API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
