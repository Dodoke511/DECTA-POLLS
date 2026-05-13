export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/verify_otp_only
 * Validates an OTP against its HMAC hash without creating any user.
 * Used for candidate registration where user creation is handled separately.
 */
export async function POST(request: Request) {
  try {
    const { email, otp, hash, expires } = await request.json();

    if (!email || !otp || !hash || !expires) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check expiration
    if (Date.now() > expires) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Re-calculate HMAC hash and compare
    const secret = process.env.OTP_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_otp_secret_key';
    const data = `${email}.${otp}.${expires}`;
    const calculatedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (calculatedHash !== hash) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    console.error('Verify OTP Only Error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
