import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import {
  clearLoginAttempts,
  isLoginBlocked,
  loadGlobalSettingsFromDb,
  recordFailedLoginAttempt,
  registerSingleDeviceSession,
} from '@/lib/security';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Internal server error';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  const { tenant_slug, election_slug } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const supabaseService = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);


  try {
    const { email, password } = await request.json();

    console.log(`[Election Login API] Attempting login for: ${tenant_slug} / ${election_slug}`);

    const settings = await loadGlobalSettingsFromDb(supabaseService);
    const securitySettings = settings.security;
    const blockedState = await isLoginBlocked(email, supabaseService);
    if (blockedState.blocked) {
      const retryAfterSeconds = blockedState.lockedUntil
        ? Math.max(0, Math.ceil((new Date(blockedState.lockedUntil).getTime() - Date.now()) / 1000))
        : 0;
      return NextResponse.json({
        error: `Too many failed login attempts. Try again after ${retryAfterSeconds} seconds.`,
        lockedUntil: blockedState.lockedUntil,
        retryAfterSeconds,
      }, { status: 429 });
    }

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .eq('is_verified', true)
      .single();

    if (!tenant) {
      console.error(`[Election Login API] Tenant not found or not verified: ${tenant_slug}`);
      return NextResponse.json({ error: 'Tenant not found or not verified' }, { status: 404 });
    }

    // 2. Resolve election
    const { data: election } = await supabase
      .from('election')
      .select('id')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // 3. Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      const failure = await recordFailedLoginAttempt(email, securitySettings.max_login_attempts, securitySettings.lockout_seconds, supabaseService);
      const retryAfterSeconds = failure.lockedUntil
        ? Math.max(0, Math.ceil((new Date(failure.lockedUntil).getTime() - Date.now()) / 1000))
        : 0;
      return NextResponse.json({
        error: failure.blocked ? `Too many failed login attempts. Try again after ${retryAfterSeconds} seconds.` : 'Invalid email or password',
        lockedUntil: failure.lockedUntil,
        retryAfterSeconds,
      }, { status: failure.blocked ? 429 : 401 });
    }

    // 4. Verify user exists in tenant_users for this tenant
    const { data: tenantUser } = await supabase
      .from('tenant users')
      .select('id, user_type')
      .eq('id', authData.user.id)
      .eq('tenantID', tenant.id)
      .single();

    if (!tenantUser) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'No account found for this organization' }, { status: 403 });
    }

    const userType = tenantUser.user_type?.toLowerCase();
    const allowedTypes = ['voter', 'candidate', 'admin', 'sub-admin'];
    if (!allowedTypes.includes(userType)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Unauthorized user type for this portal' }, { status: 403 });
    }

    // 5. Generate vote token if voting phase is active and user doesn't have one
    const { data: phases } = await supabase
      .from('election phase')
      .select('*')
      .eq('electionID', election.id);

    if (isPhaseActive(phases || [], 'voting')) {
      const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: existingToken } = await supabaseAdmin
        .from('vote_tokens')
        .select('id')
        .eq('election_id', election.id)
        .eq('voter_id', authData.user.id)
        .limit(1)
        .maybeSingle();

      if (!existingToken) {
        const crypto = require('crypto');
        const rawTokenData = `${election.id}:${authData.user.id}:${crypto.randomUUID()}`;
        const secureHash = crypto.createHash('sha256').update(rawTokenData).digest('hex');

        const { error: insertError } = await supabaseAdmin
          .from('vote_tokens')
          .insert({
            election_id: election.id,
            voter_id: authData.user.id,
            token_hash: secureHash,
            used: false
          });
          
        if (insertError) {
          console.error(`[Election Login API] Failed to auto-generate token for ${email}:`, insertError);
        } else {
          console.log(`[Election Login API] Auto-generated vote token for ${email}`);
        }
      }
    }

    await clearLoginAttempts(email, supabaseService);
    const sessionExpiration = new Date(Date.now() + securitySettings.session_timeout * 60 * 1000).toISOString();
    const sessionRegistration = await registerSingleDeviceSession(
      authData.user.id,
      authData.session?.access_token || '',
      'public-election-login',
      sessionExpiration,
      supabaseService
    );

    if (!sessionRegistration.success) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: sessionRegistration.reason || 'An active session already exists for this account.' }, { status: 409 });
    }

    if (userType === 'voter' && authData.user?.user_metadata?.temporary_password === true) {
      return NextResponse.json({
        success: true,
        requiresPasswordChange: true,
        session: authData.session,
        message: 'Temporary password accepted. Please change your password before continuing.',
      });
    }

    return NextResponse.json({ success: true, session: authData.session });

  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
