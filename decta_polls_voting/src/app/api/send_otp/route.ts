export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate 6-digit cryptographically secure OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        // Expire in 90 seconds
        const expires = Date.now() + 90 * 1000;

        // Hash the OTP to return to the client securely
        const secret = process.env.OTP_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_otp_secret_key';
        const data = `${email}.${otp}.${expires}`;
        const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');

        // Configure Nodemailer
        // It requires EMAIL_USER and EMAIL_PASS environment variables
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Standard configuration for Gmail
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send email
        await transporter.sendMail({
            from: `"DECTA Polls" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>DECTA Polls Registration</h2>
                <p>Use the following 6-digit code to verify your email address:</p>
                <h1 style="color: #5D44F8; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
                <p><strong>This code will expire in 60 seconds.</strong></p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
            `,
        });

        // We return the hash and expiry time to the client so it can verify the entered OTP later
        return NextResponse.json({ success: true, hash, expires });
    } catch (error: any) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP. Ensure EMAIL_USER and EMAIL_PASS are configured in your environment variables.' }, { status: 500 });
    }
}
