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

    // 1. Verify invitation
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

    // 2. Create Auth User
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

    // 3. Insert into "tenant users"
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
          status: 'active',
          roleID: invite.roleID
        }
      ]);

    if (userTableError) {
      console.error("[accept_invitation] DB User Insert Error:", userTableError);
      
      // If the error is likely a missing column "roleID", we might want to inform the user nicely
      if (userTableError.message.includes('column "roleID" of relation "tenant users" does not exist')) {
          return NextResponse.json({ 
              error: "Database Schema Error: The 'tenant users' table is missing a 'roleID' column. Please contact support." 
          }, { status: 500 });
      }

      return NextResponse.json({ error: "Failed to create user record: " + userTableError.message }, { status: 500 });
    }

    // 4. Update Invitation Status
    const { error: updateInviteError } = await supabase
      .from("tenant invitations")
      .update({ status: "Accepted" })
      .eq("token", token);

    if (updateInviteError) {
        console.warn("[accept_invitation] Failed to update invite status:", updateInviteError);
    }

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
