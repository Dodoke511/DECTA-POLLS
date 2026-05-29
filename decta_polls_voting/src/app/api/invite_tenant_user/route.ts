import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, first_name, middle_name, surname, roleId, tenantEmail } = body;

    if (!email || !first_name || !surname || !roleId || !tenantEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get the Tenant ID from the tenantEmail
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, organization")
      .eq("email", tenantEmail)
      .single();

    if (tenantError || !tenant) {
      console.error("[invite_tenant_user] Tenant lookup error:", tenantError);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 2. Generate a secure unique token
    const token = crypto.randomBytes(32).toString("hex");

    // 3. Insert into "tenant invitations" table
    const { error: inviteError } = await supabase
      .from("tenant invitations")
      .insert([
        {
          email,
          first_name,
          middle_name,
          surname,
          roleID: roleId,
          tenantID: tenant.id,
          token: token,
          status: "Pending"
        }
      ]);

    if (inviteError) {
      console.error("[invite_tenant_user] DB Insert Error:", inviteError);
      // Check for unique constraint violation (email + tenantID)
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: "An invitation has already been sent to this email for this tenant." }, { status: 409 });
      }
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // 4. Send the Invitation Email
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (!user || !pass) {
        console.error("[invite_tenant_user] Email credentials missing");
        return NextResponse.json({ error: "Email configuration error" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const inviteLink = `${appUrl}/auth/accept_invitation?token=${token}`;

    await transporter.sendMail({
      from: `"DECTA Polls" <${user}>`,
      to: email,
      subject: `Invitation to join ${tenant.organization} on DECTA Polls`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e1b4b; background-color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">DECTA <span style="color: #1e1b4b;">POLLS</span></h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px;">Hello ${first_name},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              You have been invited by <strong>${tenant.organization}</strong> to join their team as a member of their digital election staff on DECTA Polls.
            </p>
            
            <div style="margin: 32px 0; text-align: center;">
              <a href="${inviteLink}" 
                 style="background-color: #4f35cd; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(79, 53, 205, 0.4);">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
              This link will direct you to set up your account and finalize your role assignment.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 12px;">
            <p>© 2026 DECTA Polls. All rights reserved.</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: "Invitation sent successfully" });
  } catch (err: any) {
    console.error("[invite_tenant_user] Global Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
