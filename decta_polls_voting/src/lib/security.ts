export interface SecuritySettings {
  min_password_length: number;
  max_password_length: number;
  allowed_special_chars: string;
  session_timeout: number;
  max_login_attempts: number;
  lockout_seconds: number;
  enable_password_expiry: boolean;
}

export interface RetentionSettings {
  audit_log_days: number;
  election_data_days: number;
}

export interface GlobalSettings {
  security: SecuritySettings;
  retention: RetentionSettings;
  tenant_defaults?: Record<string, any>;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  min_password_length: 12,
  max_password_length: 64,
  allowed_special_chars: '!@#$%^&*()',
  session_timeout: 60,
  max_login_attempts: 5,
  lockout_seconds: 30,
  enable_password_expiry: true,
};

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  audit_log_days: 365,
  election_data_days: 730,
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  security: DEFAULT_SECURITY_SETTINGS,
  retention: DEFAULT_RETENTION_SETTINGS,
};

function parsePossiblyJson(value: any) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeGlobalSettings(raw: any): GlobalSettings {
  const security = {
    ...DEFAULT_SECURITY_SETTINGS,
    ...(raw?.security ?? {}),
  } as SecuritySettings;

  const retention = {
    ...DEFAULT_RETENTION_SETTINGS,
    ...(raw?.retention ?? {}),
  } as RetentionSettings;

  return {
    security: {
      min_password_length: Number(security.min_password_length) || DEFAULT_SECURITY_SETTINGS.min_password_length,
      max_password_length: Number(security.max_password_length) || DEFAULT_SECURITY_SETTINGS.max_password_length,
      allowed_special_chars: String(security.allowed_special_chars || DEFAULT_SECURITY_SETTINGS.allowed_special_chars),
      session_timeout: Number(security.session_timeout) || DEFAULT_SECURITY_SETTINGS.session_timeout,
      max_login_attempts: Number(security.max_login_attempts) || DEFAULT_SECURITY_SETTINGS.max_login_attempts,
      lockout_seconds: Number(security.lockout_seconds) || DEFAULT_SECURITY_SETTINGS.lockout_seconds,
      enable_password_expiry: Boolean(security.enable_password_expiry),
    },
    retention: {
      audit_log_days: Number(retention.audit_log_days) || DEFAULT_RETENTION_SETTINGS.audit_log_days,
      election_data_days: Number(retention.election_data_days) || DEFAULT_RETENTION_SETTINGS.election_data_days,
    },
    tenant_defaults: raw?.tenant_defaults || {},
  };
}

function getPasswordChecks(password: string, normalized: SecuritySettings) {
  const allowedSpecialChars = normalized.allowed_special_chars || DEFAULT_SECURITY_SETTINGS.allowed_special_chars;
  const specialCharsEscaped = allowedSpecialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const specialPattern = new RegExp(`[${specialCharsEscaped}]`);

  return {
    length: password.length >= normalized.min_password_length && password.length <= normalized.max_password_length,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: specialPattern.test(password),
  };
}

export function validatePassword(password: string, security: SecuritySettings = DEFAULT_SECURITY_SETTINGS) {
  const normalized = normalizeGlobalSettings({ security }).security;
  const checks = getPasswordChecks(password, normalized);

  const errors: string[] = [];
  if (password.length < normalized.min_password_length) {
    errors.push(`Password must be at least ${normalized.min_password_length} characters long.`);
  }
  if (password.length > normalized.max_password_length) {
    errors.push(`Password must be at most ${normalized.max_password_length} characters long.`);
  }
  if (!checks.uppercase) {
    errors.push('Must include at least one uppercase letter (A–Z).');
  }
  if (!checks.lowercase) {
    errors.push('Must include at least one lowercase letter (a–z).');
  }
  if (!checks.number) {
    errors.push('Must include at least one number (0–9).');
  }
  if (!checks.special) {
    errors.push(`Must include at least one special character (${normalized.allowed_special_chars || DEFAULT_SECURITY_SETTINGS.allowed_special_chars}).`);
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    strength: getPasswordStrength(password, normalized),
  };
}

export function getPasswordStrength(password: string, security: SecuritySettings = DEFAULT_SECURITY_SETTINGS) {
  const normalized = normalizeGlobalSettings({ security }).security;
  const checks = getPasswordChecks(password, normalized);
  const lengthScore = Math.min(1, password.length / Math.max(normalized.min_password_length, 12));
  const baseScore = [checks.length, checks.uppercase, checks.lowercase, checks.number, checks.special].filter(Boolean).length;
  const percentage = Math.min(100, Math.round((baseScore / 5) * 100 + lengthScore * 10));
  let label = 'Very Weak';
  let color = '#ef4444';

  if (percentage >= 80) {
    label = 'Strong';
    color = '#22c55e';
  } else if (percentage >= 60) {
    label = 'Good';
    color = '#f59e0b';
  } else if (percentage >= 40) {
    label = 'Fair';
    color = '#f97316';
  }

  return {
    score: percentage,
    label,
    color,
  };
}

export async function loadGlobalSettingsFromDb(supabaseClient: any): Promise<GlobalSettings> {
  const { data, error } = await supabaseClient.from('system_settings').select('*');
  if (error) {
    throw error;
  }

  const raw = (data || []).reduce((acc: any, row: any) => {
    acc[row.key] = parsePossiblyJson(row.value);
    return acc;
  }, {});

  return normalizeGlobalSettings(raw);
}

export async function isLoginBlocked(identifier: string, supabaseClient: any) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const { data, error } = await supabaseClient.from('login_attempts').select('*').eq('identifier', normalizedIdentifier).maybeSingle();
  if (error) {
    throw error;
  }

  if (!data || !data.locked_until) {
    return { blocked: false, lockedUntil: null, attemptCount: data?.attempt_count ?? 0 };
  }

  const lockDate = new Date(data.locked_until);
  if (Date.now() < lockDate.getTime()) {
    return { blocked: true, lockedUntil: lockDate.toISOString(), attemptCount: data.attempt_count };
  }

  return { blocked: false, lockedUntil: null, attemptCount: 0 };
}

export async function recordFailedLoginAttempt(identifier: string, maxAttempts: number, lockoutSeconds: number, supabaseClient: any) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const now = new Date();
  const { data, error } = await supabaseClient
    .from('login_attempts')
    .select('*')
    .eq('identifier', normalizedIdentifier)
    .maybeSingle();
  if (error) {
    throw error;
  }

  let attemptCount = 1;
  let lockedUntil: string | null = null;

  if (data && data.locked_until && new Date(data.locked_until).getTime() > now.getTime()) {
    attemptCount = Number(data.attempt_count || 0) + 1;
  } else if (data) {
    attemptCount = Number(data.attempt_count || 0) + 1;
  }

  if (attemptCount >= maxAttempts) {
    const expiresAt = new Date(now.getTime() + lockoutSeconds * 1000);
    lockedUntil = expiresAt.toISOString();
  }

  const { error: upsertError } = await supabaseClient.from('login_attempts').upsert({
    identifier: normalizedIdentifier,
    attempt_count: attemptCount,
    last_failed_at: now.toISOString(),
    locked_until: lockedUntil,
  }, { onConflict: 'identifier' });
  if (upsertError) {
    throw upsertError;
  }

  return { blocked: Boolean(lockedUntil), lockedUntil, attemptCount };
}

export async function clearLoginAttempts(identifier: string, supabaseClient: any) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  await supabaseClient.from('login_attempts').delete().eq('identifier', normalizedIdentifier);
}

export async function registerSingleDeviceSession(
  userId: string,
  sessionId: string,
  deviceInfo: string,
  expiresAt: string,
  supabaseClient: any
) {
  const now = new Date().toISOString();
  await supabaseClient.from('user_sessions').update({ active: false }).lt('expires_at', now);

  const { data: existingSession, error: existingError } = await supabaseClient
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (existingError) {
    throw existingError;
  }
  if (existingSession) {
    return { success: false, reason: 'Another active session already exists for this user.' };
  }

  const { error } = await supabaseClient.from('user_sessions').insert([{ user_id: userId, session_id: sessionId, device_info: deviceInfo, expires_at: expiresAt, active: true }]);
  if (error) {
    throw error;
  }

  return { success: true };

}

export async function clearUserSession(sessionId: string, supabaseClient: any) {
  await supabaseClient.from('user_sessions').update({ active: false }).eq('session_id', sessionId);
}

export async function clearUserSessionsForUser(userId: string, supabaseClient: any) {
  await supabaseClient.from('user_sessions').update({ active: false }).eq('user_id', userId);
}
