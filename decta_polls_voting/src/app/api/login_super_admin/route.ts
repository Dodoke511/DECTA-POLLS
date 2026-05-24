import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const superAdminEmail = process.env.EMAIL_USER;
        const superAdminPass = process.env.SUPER_ADMIN_PASS;

        if (!superAdminEmail || !superAdminPass) {
            console.error('Super admin credentials are not configured in environment variables.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        if (email === superAdminEmail && password === superAdminPass) {
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    } catch (error) {
        console.error('Super admin login error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
