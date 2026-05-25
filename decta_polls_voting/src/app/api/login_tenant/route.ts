import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  clearLoginAttempts,
  isLoginBlocked,
  loadGlobalSettingsFromDb,
  recordFailedLoginAttempt,
  registerSingleDeviceSession,
} from '@/lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    const { email: rawEmail, password } = await request.json();
    const email = rawEmail.trim().toLowerCase();
    try {
        const settings = await loadGlobalSettingsFromDb(supabase);
        const securitySettings = settings.security;

        const blockedState = await isLoginBlocked(email, supabase);
        if (blockedState.blocked) {
            return NextResponse.json({
                error: `Too many failed login attempts. Try again after ${blockedState.lockedUntil}.`,
                lockedUntil: blockedState.lockedUntil,
            }, { status: 429 });
        }

        // First check if we have an existing session
        const { data: { session } } = await supabase.auth.getSession();

        // If there's an existing session, sign out first
        if (session) {
            await supabase.auth.signOut();
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            const failure = await recordFailedLoginAttempt(email, securitySettings.max_login_attempts, securitySettings.lockout_seconds, supabase);
            return NextResponse.json({
                error: failure.blocked ? `Too many failed login attempts. Try again after ${failure.lockedUntil}.` : 'Invalid email or password',
                lockedUntil: failure.lockedUntil,
            }, { status: failure.blocked ? 429 : 401 });
        }

        // Retrieve the tenant from the 'tenant users' table using the authenticated user id.
        // Also fetch the tenant status for approval checks.
        const { data: userData, error: userFetchError } = await supabase
            .from('tenant users')
            .select(`
                tenantID, 
                email,
                tenants (
                    status
                )
            `)
            .eq('id', data.user.id)
            .single();

        if (userFetchError || !userData) {
            // Log out user if we can't find their tenant record
            await supabase.auth.signOut();
            return NextResponse.json({ error: 'Unauthorized: No tenant configuration found.' }, { status: 403 });
        }

        const tenantStatus = (userData as any).tenants?.status || 'PENDING';

        // 1. Block access for REJECTED/DENIED
        if (['REJECTED', 'DENIED'].includes(tenantStatus)) {
            await supabase.auth.signOut();
            return NextResponse.json({ 
                error: `Your tenant account is ${tenantStatus}. Please contact support.` 
            }, { status: 403 });
        }

        await clearLoginAttempts(email, supabase);
        const sessionExpiration = new Date(Date.now() + securitySettings.session_timeout * 60 * 1000).toISOString();
        const sessionRegistration = await registerSingleDeviceSession(
            data.user.id,
            data.session?.access_token || '',
            'tenant-login',
            sessionExpiration,
            supabase
        );

        if (!sessionRegistration.success) {
            await supabase.auth.signOut();
            return NextResponse.json({ error: sessionRegistration.reason || 'An active session already exists for this account.' }, { status: 409 });
        }

        return NextResponse.json({
            message: 'Login successful',
            user: data.user,
            session: data.session,
            tenantId: userData.tenantID,
            tenantEmail: userData.email,
            tenantStatus: tenantStatus,
        }, { status: 200 });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}