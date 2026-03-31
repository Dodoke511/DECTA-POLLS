import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

type SendVerificationEmailBody = {
  tenantId?: string;
  email?: string;
  organization?: string;
  verificationUrl?: string | null;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as SendVerificationEmailBody;
  const tenantId = body.tenantId?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const organization = body.organization?.trim() || "your organization";
  const verificationUrl = body.verificationUrl?.trim() ?? "";

  if (!tenantId) {
    return new Response(
      JSON.stringify({ message: "Missing tenant id." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (!email || !isValidEmail(email)) {
    return new Response(
      JSON.stringify({ message: "Invalid recipient email." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (!verificationUrl) {
    return new Response(
      JSON.stringify({ message: "Missing verification file link." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return new Response(
      JSON.stringify({ message: "Email sender credentials are missing in env." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"DECTA Polls" <${user}>`,
      to: email,
      subject: "Welcome to DECTA POLLS — Verified",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
          <p>Hello <strong>${organization}</strong>,</p>
          <p><strong>Welcome to DECTA POLLS, you are now fully Verified. Thank you for choosing us!</strong></p>
          <p>
            <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">
              View your verification file
            </a>
          </p>
          <p>Thank you,<br/>DECTA Polls Team</p>
        </div>
      `,
    });

    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({ is_verified: true })
      .eq("id", tenantId);

    if (updateError) {
      return new Response(
        JSON.stringify({ message: "Email sent, but failed to update tenant verification status." }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ message: "Verification email sent and tenant marked as verified." }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ message: "Failed to send verification email." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
