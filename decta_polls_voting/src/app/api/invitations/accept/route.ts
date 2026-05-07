import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role key is required for admin.createUser
const supabase = createClient(supabaseUrl, supabaseKey!);

export async function POST(request: Request) {
  try {
    const { token, password, contact, birth_date, first_name, surname, email, middle_name } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (!supabaseKey) {
      return NextResponse.json({ error: "Server configuration error: Service role key missing" }, { status: 500 });
    }

    console.log("[accept_invitation] 1. Verifying invitation...");
    const { data: invite, error: inviteError } = await supabase
      .from("tenant invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    if (invite.status !== "Pending") {
      return NextResponse.json({ error: "Invitation has already been accepted" }, { status: 400 });
    }

    console.log("[accept_invitation] 2. Creating Auth User...");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email || invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || invite.first_name,
        surname: surname || invite.surname
      }
    });

    if (authError) {
      console.error("[accept_invitation] Auth Error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authUser.user.id;

    console.log("[accept_invitation] 3. Inserting into tenant users...");
    const { error: userTableError } = await supabase
      .from("tenant users")
      .insert([
        {
          id: userId,
          tenantID: invite.tenantID,
          email: email || invite.email,
          first_name: first_name || invite.first_name,
          middle_name: middle_name || invite.middle_name,
          surname: surname || invite.surname,
          contact: contact || invite.contact,
          birth_date: birth_date || invite.birth_date,
          user_type: 'sub-admin'
        }
      ]);

    if (userTableError) {
      console.error("[accept_invitation] DB User Insert Error:", userTableError);
      return NextResponse.json({ error: "Failed to create user record: " + userTableError.message }, { status: 500 });
    }

    console.log("[accept_invitation] 3.5 Inserting into userRoles...");
    if (invite.roleID) {
      const { error: roleError } = await supabase
        .from("userRoles")
        .insert([
          {
            userID: userId,
            roleID: invite.roleID
          }
        ]);

      if (roleError) {
        console.error("[accept_invitation] DB UserRole Insert Error:", roleError);
        return NextResponse.json({ error: "Failed to assign user role: " + roleError.message }, { status: 500 });
      }
    }

    console.log("[accept_invitation] 4. Updating invitation status...");
    const { error: updateInviteError } = await supabase
      .from("tenant invitations")
      .update({ status: "Accepted", roleID: null })
      .eq("token", token);

    if (updateInviteError) {
      console.warn("[accept_invitation] Failed to update invite status:", updateInviteError);
    }

    console.log("[accept_invitation] Returning success...");
    return NextResponse.json({
      success: true,
      message: "Account created successfully! You can now log in.",
      userId: userId
    });

  } catch (err: any) {
    console.error("[accept_invitation] Global Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
