export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .eq('is_verified', true)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or not verified' }, { status: 404 });
    }

    // 2. Resolve election
    const { data: election } = await supabase
      .from('election')
      .select('id')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // 3. Verify user exists in tenant_users for this tenant as a Voter
    const { data: tenantUser } = await supabaseAdmin
      .from('tenant users')
      .select('id, user_type')
      .eq('email', email.toLowerCase())
      .eq('tenantID', tenant.id)
      .single();

    if (!tenantUser) {
      return NextResponse.json({ error: 'Your email is not registered in the Voter list for this election.' }, { status: 404 });
    }

    if (tenantUser.user_type?.toLowerCase() !== 'voter') {
      return NextResponse.json({ error: 'Only voters can request a temporary password OTP.' }, { status: 403 });
    }

    // 4. Find the user in Supabase Auth to check if they have a temporary password
    let authUser = null;
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage
        });
        
        if (listError) {
            console.error('List users error:', listError);
            return NextResponse.json({ error: 'Failed to look up authentication account.' }, { status: 500 });
        }

        const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
            authUser = found;
            break;
        }

        if (!listData.users || listData.users.length < perPage) {
            hasMore = false;
        } else {
            page++;
        }
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Voter account is registered, but authentication credentials do not exist.' }, { status: 404 });
    }

    if (authUser.user_metadata?.temporary_password !== true) {
      return NextResponse.json({ error: 'Your account is already set up. Please sign in with your permanent password instead.' }, { status: 400 });
    }

    // 5. Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 6. Update the user's password in Supabase Auth to this OTP
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: otp,
    });

    if (updateError) {
        console.error('Failed to update temporary password in Supabase:', updateError);
        return NextResponse.json({ error: 'Failed to generate temporary password. Please try again.' }, { status: 500 });
    }

    // 7. Send the email via Nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"DECTA Polls" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Temporary Voter Password',
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #5D44F8; text-align: center; margin-bottom: 24px;">DECTA Polls - First-Time Voter Login</h2>
            <p>Hello,</p>
            <p>You have been registered to vote in the election. To log in and cast your vote, please use the following 6-digit temporary password:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
                <h1 style="color: #5D44F8; letter-spacing: 5px; font-size: 36px; margin: 0; font-family: monospace;">${otp}</h1>
            </div>
            <p><strong>Please note:</strong> You will be required to change this temporary password immediately after logging in to secure your account.</p>
            <p style="font-size: 13px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                If you did not request this code, please ignore this email.
            </p>
        </div>
        `,
    });

    return NextResponse.json({ success: true, message: 'Temporary password OTP sent to your email.' });

  } catch (error: any) {
    console.error('Send Temporary OTP Error:', error);
    return NextResponse.json({ error: 'Failed to send OTP. Ensure EMAIL_USER and EMAIL_PASS are configured in your environment variables.' }, { status: 500 });
  }
}
