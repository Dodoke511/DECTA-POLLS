export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { email, newPassword, otp, hash, expires } = await request.json();

        if (!email || !newPassword || !otp || !hash || !expires) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check expiration
        if (Date.now() > expires) {
            return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
        }

        // Re-calculate hash to verify OTP
        const secret = process.env.OTP_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_otp_secret_key';
        const data = `${email}.${otp}.${expires}`;
        const calculatedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

        if (calculatedHash !== hash) {
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Initialize Supabase admin client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Look up user by email
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
        }

        const user = listData.users.find((u) => u.email === email);
        if (!user) {
            return NextResponse.json({ error: 'No account found with that email address' }, { status: 404 });
        }

        // Update the password
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
        });

        if (updateError) {
            return NextResponse.json({ error: updateError.message || 'Failed to reset password' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Password reset successfully' });
    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
