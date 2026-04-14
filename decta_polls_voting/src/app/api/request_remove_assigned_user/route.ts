import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

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

    // 1. Fetch tenant + role info for the email
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

    // 2. Generate a secure token and store a pending removal record
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Upsert so re-requesting replaces the old pending token
    const { error: insertError } = await supabase
      .from("removal confirmations")
      .upsert(
        {
          token,
          role_id: roleId,
          email,
          tenant_email: tenantEmail ?? null,
          organization,
          role_name: roleName,
          status: "pending",
          expires_at: expiresAt,
        },
        { onConflict: "email,role_id" }
      );

    if (insertError) {
      console.error("[request_remove] DB insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Send the confirmation email to the assigned person
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!emailUser || !emailPass) {
      return NextResponse.json(
        { error: "Email configuration error" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    const confirmLink = `${appUrl}/auth/confirm_removal?token=${token}`;

    await transporter.sendMail({
      from: `"DECTA Polls" <${emailUser}>`,
      to: email,
      subject: `Action Required: Confirm removal of your access to ${organization}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e1b4b; background-color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">DECTA <span style="color: #1e1b4b;">POLLS</span></h1>
          </div>

          <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px;">Access Removal Requested</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              An administrator of <strong>${organization}</strong> has requested to remove your <strong>${roleName}</strong> role assignment on DECTA Polls.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              To confirm this action and acknowledge that your access will be removed, please click the button below.
              This link will expire in <strong>24 hours</strong>.
            </p>

            <div style="margin: 32px 0; text-align: center;">
              <a href="${confirmLink}"
                 style="background-color: #dc2626; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3);">
                Confirm Removal of Access
              </a>
            </div>

            <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
              If you did not expect this request, please ignore this email or contact your organization's administrator immediately. Your access will remain unchanged unless you click the button above.
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 12px;">
            <p>© 2026 DECTA Polls. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[request_remove] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
