import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { roleId, email, tenantEmail } = await request.json();

    if (!roleId || !email) {
      return NextResponse.json(
        { error: "roleId and email are required" },
        { status: 400 }
      );
    }

    // 1. Fetch tenant info for the email body
    let organization = "your organization";
    let roleName = "your assigned role";

    if (tenantEmail) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("organization")
        .eq("email", tenantEmail)
        .single();
      if (tenant?.organization) organization = tenant.organization;
    }

    const { data: role } = await supabase
      .from("tenant roles")
      .select("roleName")
      .eq("id", roleId)
      .single();
    if (role?.roleName) roleName = role.roleName;

    // 2. Get user ID from email, then delete their role assignment
    const { data: user, error: userError } = await supabase
      .from("tenant users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("userRoles")
      .delete()
      .eq("userID", user.id)
      .eq("roleID", roleId);

    if (error) {
      console.error("[remove_assigned_user] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2.5 Also completely remove them from the tenant so they don't take up a limit slot
    await supabase.from("tenant users").delete().eq("id", user.id);
    await supabase.auth.admin.deleteUser(user.id);

    // 3. Send a notification email to the removed user
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass },
      });

      await transporter.sendMail({
        from: `"DECTA Polls" <${emailUser}>`,
        to: email,
        subject: `Your access to ${organization} has been removed`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e1b4b; background-color: #f8fafc; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">DECTA <span style="color: #1e1b4b;">POLLS</span></h1>
            </div>

            <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px;">Access Removed</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                This is to inform you that your role assignment (<strong>${roleName}</strong>) within
                <strong>${organization}</strong> on DECTA Polls has been removed by an administrator.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                You no longer have access to the features and data associated with that role.
                If you believe this was done in error, please contact your organization's administrator.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 12px;">
              <p>© 2026 DECTA Polls. All rights reserved.</p>
              <p>If you weren't expecting this notification, please contact your administrator.</p>
            </div>
          </div>
        `,
      });
    } else {
      console.warn("[remove_assigned_user] Email credentials missing — skipping notification.");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[remove_assigned_user] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
