export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { email, password, otp, hash, expires } = await request.json();

        if (!email || !otp || !hash || !expires) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check expiration
        if (Date.now() > expires) {
            return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
        }

        // Re-calculate hash
        const secret = process.env.OTP_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_otp_secret_key';
        const data = `${email}.${otp}.${expires}`;
        const calculatedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

        if (calculatedHash !== hash) {
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Initialize Supabase admin client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        let authUser;

        // Try to create the user since this is registration
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (createError) {
            // If creation fails (e.g. user already exists), try to sign in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                console.error('Auth Error:', signInError);
                return NextResponse.json({ error: signInError.message || 'Failed to authenticate user' }, { status: 400 });
            }
            authUser = signInData.user;
        } else {
            authUser = createData.user;
        }

        return NextResponse.json({
            success: true,
            message: 'OTP verified successfully',
            user: authUser,
        });
    } catch (error: any) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
    }
}
