import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkUserLimit } from "@/lib/server/user-limit-check";
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

    console.log("[accept_invitation] 1.5 Checking User Limit...");
    const limitCheck = await checkUserLimit(invite.tenantID);
    if (!limitCheck.allowed) {
      console.warn(`[accept_invitation] Tenant ${invite.tenantID} has reached user limit of ${limitCheck.limit}. Cannot accept invite.`);
      return NextResponse.json({ 
        error: `Cannot accept invitation. The organization has reached its maximum user limit of ${limitCheck.limit}.` 
      }, { status: 403 });
    }

    // 2. Check if user already exists in the "tenant users" table
    const targetEmail = (email || invite.email).toLowerCase();
    console.log("[accept_invitation] 2. Checking if email already exists:", targetEmail);
    
    const { data: existingTenantUser, error: fetchUserError } = await supabase
      .from("tenant users")
      .select("*")
      .eq("email", targetEmail)
      .maybeSingle();

    let userId: string | null = null;
    let isAlreadyRegisteredSameTenant = false;
    let isAlreadyRegisteredDifferentTenant = false;

    if (existingTenantUser) {
      userId = existingTenantUser.id;
      if (existingTenantUser.tenantID === invite.tenantID) {
        isAlreadyRegisteredSameTenant = true;
        console.log("[accept_invitation] User already registered under the same tenant.");
      } else {
        isAlreadyRegisteredDifferentTenant = true;
        console.log("[accept_invitation] User registered under a different tenant (external account).");
      }
    }

    if (isAlreadyRegisteredSameTenant || isAlreadyRegisteredDifferentTenant) {
      // User exists in auth and tenant users.
      // Update their password in Supabase Auth so they can log in using their new credentials
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId!, {
        password: password
      });

      if (authUpdateError) {
        console.error("[accept_invitation] Failed to update password for existing user:", authUpdateError);
        return NextResponse.json({ error: "Failed to update account: " + authUpdateError.message }, { status: 500 });
      }

      if (isAlreadyRegisteredSameTenant) {
        // Just update details if needed
        const { error: updateProfileError } = await supabase
          .from("tenant users")
          .update({
            first_name: first_name || invite.first_name,
            middle_name: middle_name || invite.middle_name,
            surname: surname || invite.surname,
            contact: contact || invite.contact,
            birth_date: birth_date || invite.birth_date,
            user_type: 'sub-admin'
          })
          .eq("id", userId!);

        if (updateProfileError) {
          console.error("[accept_invitation] Failed to update profile details:", updateProfileError);
        }
      } else {
        // External Account: Migrate the user to the new tenant based on the admin's decision to invite them
        console.log(`[accept_invitation] Migrating external user ${userId} to tenant ${invite.tenantID}...`);
        const { error: migrateError } = await supabase
          .from("tenant users")
          .update({
            tenantID: invite.tenantID,
            first_name: first_name || invite.first_name,
            middle_name: middle_name || invite.middle_name,
            surname: surname || invite.surname,
            contact: contact || invite.contact,
            birth_date: birth_date || invite.birth_date,
            user_type: 'sub-admin'
          })
          .eq("id", userId!);

        if (migrateError) {
          console.error("[accept_invitation] Failed to migrate external user profile:", migrateError);
          return NextResponse.json({ error: "Failed to transfer account: " + migrateError.message }, { status: 500 });
        }
      }
    } else {
      // 3. Email is not in "tenant users" table. Let's try to create or locate the auth user
      console.log("[accept_invitation] 3. Creating/Locating Auth User...");
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || invite.first_name,
          surname: surname || invite.surname
        }
      });

      if (authError) {
        // If they already exist globally in Auth but not in "tenant users"
        const isAlreadyInAuth =
          authError.message.toLowerCase().includes("already") ||
          authError.message.toLowerCase().includes("registered") ||
          authError.status === 422;

        if (isAlreadyInAuth) {
          console.log("[accept_invitation] User exists in Auth globally but not in tenant users. Fetching user ID...");
          let foundId: string | null = null;
          let page = 1;
          const perPage = 1000;

          while (!foundId) {
            const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
            if (listError || !listData?.users?.length) break;

            const match = listData.users.find((u) => u.email?.toLowerCase() === targetEmail);
            if (match) {
              foundId = match.id;
              break;
            }
            if (listData.users.length < perPage) break;
            page++;
          }

          if (foundId) {
            userId = foundId;
            // Update password for existing auth user
            const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
              password: password
            });
            if (authUpdateError) {
              console.error("[accept_invitation] Failed to update password for existing auth user:", authUpdateError);
            }
          } else {
            console.error("[accept_invitation] Auth Error:", authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
          }
        } else {
          console.error("[accept_invitation] Auth Error:", authError);
          return NextResponse.json({ error: authError.message }, { status: 500 });
        }
      } else {
        userId = authUser.user.id;
      }

      // 4. Insert new record into "tenant users" table since they weren't in it
      console.log("[accept_invitation] 4. Inserting into tenant users...");
      const { error: userTableError } = await supabase
        .from("tenant users")
        .insert([
          {
            id: userId,
            tenantID: invite.tenantID,
            email: targetEmail,
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
    }

    console.log("[accept_invitation] 3.5 Inserting into userRoles...");
    if (invite.roleID) {
      // First let's check if they already have this role assigned to prevent unique constraint violation in userRoles
      const { data: existingUserRole, error: fetchRoleError } = await supabase
        .from("userRoles")
        .select("*")
        .eq("userID", userId!)
        .eq("roleID", invite.roleID)
        .maybeSingle();

      if (!existingUserRole && !fetchRoleError) {
        const { error: roleError } = await supabase
          .from("userRoles")
          .insert([
            {
              userID: userId!,
              roleID: invite.roleID
            }
          ]);

        if (roleError) {
          console.error("[accept_invitation] DB UserRole Insert Error:", roleError);
          return NextResponse.json({ error: "Failed to assign user role: " + roleError.message }, { status: 500 });
        }
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
      userId: userId!
    });

  } catch (err: any) {
    console.error("[accept_invitation] Global Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
