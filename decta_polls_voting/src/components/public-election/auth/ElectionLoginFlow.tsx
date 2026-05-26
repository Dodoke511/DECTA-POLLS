import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { Session, createClient } from '@supabase/supabase-js';
import { DEFAULT_SECURITY_SETTINGS, validatePassword } from '@/lib/security';

interface Props {
  onBack: () => void;
  role: 'Voter' | 'Candidate';
}

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  minLength?: number;
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisible,
  minLength,
}: PasswordFieldProps) {
  const Icon = visible ? EyeOff : Eye;
  const inputClassName = "public-election-auth-input w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 pr-12 !text-slate-900 hover:!text-slate-900 focus:!text-slate-900 active:!text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all";

  return (
    <div className="relative">
      <input
        required
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        minLength={minLength}
        className={inputClassName}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <Icon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ElectionLoginFlow({ onBack, role }: Props) {
  const { tenant, election } = useElectionPublic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [returningVoterMode, setReturningVoterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [securitySettings, setSecuritySettings] = useState(DEFAULT_SECURITY_SETTINGS);

  const newPasswordPolicy = useMemo(
    () => validatePassword(newPassword, securitySettings),
    [newPassword, securitySettings]
  );

  const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Something went wrong';

  const persistSession = async (session: Session) => {
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.setSession(session);
  };

  const getSupabaseClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const redirectAfterLogin = () => {
    if (role === "Voter") {
      window.location.href = `/${tenant.slug}/${election.slug}/dashboard`;
    } else {
      window.location.href = `/${tenant.slug}/${election.slug}/candidate-dashboard?tab=candidacy`;
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/super_admin/settings');
        if (!res.ok) return;
        const { settings } = await res.json();
        if (settings?.security) {
          setSecuritySettings({ ...DEFAULT_SECURITY_SETTINGS, ...settings.security });
        }
      } catch (err) {
        console.warn('[ElectionLoginFlow] failed to load security settings', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
    if (cooldownSecondsLeft > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldownSecondsLeft((previous) => {
          if (previous <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
              cooldownRef.current = null;
            }
            return 0;
          }
          return previous - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [cooldownSecondsLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server error (${res.status}): Expected JSON but received HTML. The API route might not be registered. Try restarting the dev server.`);
      }

      if (!res.ok) {
        if (typeof data.retryAfterSeconds === 'number' && data.retryAfterSeconds > 0) {
          setCooldownSecondsLeft(data.retryAfterSeconds);
        } else if (data.lockedUntil) {
          const retryAfterSeconds = Math.max(
            0,
            Math.ceil((new Date(data.lockedUntil).getTime() - Date.now()) / 1000)
          );
          if (retryAfterSeconds > 0) setCooldownSecondsLeft(retryAfterSeconds);
        }
        throw new Error(data.error || 'Login failed');
      }

      setCooldownSecondsLeft(0);

      if (data.requiresPasswordChange) {
        setPendingSession(data.session);
        setRequiresPasswordChange(true);
        setReturningVoterMode(false);
        setPassword('');
        return;
      }

      if (data.session) {
        await persistSession(data.session);
      }

      redirectAfterLogin();

    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!pendingSession?.access_token) {
        throw new Error('Your temporary login session expired. Please log in again.');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match.');
      }

      if (newPassword === '12345') {
        throw new Error('Choose a new password different from the temporary password.');
      }

      if (!newPasswordPolicy.valid) {
        throw new Error(newPasswordPolicy.errors[0] || 'Please choose a stronger password.');
      }

      const supabase = getSupabaseClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: pendingSession.access_token,
        refresh_token: pendingSession.refresh_token,
      });

      if (sessionError) throw sessionError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          temporary_password: false,
          password_changed_for_election: election.id,
        },
      });

      if (updateError) throw updateError;

      await supabase.auth.signOut();

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      });

      if (loginError) throw loginError;
      if (!loginData.session) throw new Error('Password changed, but login session was not created.');

      await persistSession(loginData.session);
      redirectAfterLogin();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 ml-2">
          {role === 'Voter' && returningVoterMode ? 'Voter Sign In' : `${role} Login`}
        </h2>
      </div>

      <form onSubmit={requiresPasswordChange ? handlePasswordChange : handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">{error}</div>}

        {role === 'Voter' && !requiresPasswordChange && !returningVoterMode && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
            Enter temporary password 12345 and change it once entered.
          </div>
        )}

        {role === 'Voter' && !requiresPasswordChange && returningVoterMode && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium">
            Use the password you created after changing the temporary password.
          </div>
        )}

        {requiresPasswordChange && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
            You cannot proceed to vote until you change the temporary password 12345.
          </div>
        )}

        {!requiresPasswordChange ? (
          <>
            <input
              required
              type="email"
              placeholder="Email Address"
              className="public-election-auth-input w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <PasswordField
              placeholder={role === 'Voter' && !returningVoterMode ? 'Temporary Password' : 'Password'}
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword(value => !value)}
            />
          </>
        ) : (
          <>
            <div className="group relative">
              <PasswordField
                placeholder="New Password"
                minLength={securitySettings.min_password_length}
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisible={() => setShowNewPassword(value => !value)}
              />
              <div className="absolute bottom-full left-0 mb-2 z-50 w-[240px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-xl pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                <p className="font-semibold mb-2 text-xs text-slate-700">Password Requirements</p>
                <ul className="space-y-1 text-xs">
                  <li className={newPasswordPolicy.checks.length ? 'text-emerald-600' : 'text-red-500'}>
                    • At least {securitySettings.min_password_length} characters
                  </li>
                  <li className={newPasswordPolicy.checks.uppercase ? 'text-emerald-600' : 'text-red-500'}>
                    • One uppercase letter (A–Z)
                  </li>
                  <li className={newPasswordPolicy.checks.lowercase ? 'text-emerald-600' : 'text-red-500'}>
                    • One lowercase letter (a–z)
                  </li>
                  <li className={newPasswordPolicy.checks.number ? 'text-emerald-600' : 'text-red-500'}>
                    • One number (0–9)
                  </li>
                  <li className={newPasswordPolicy.checks.special ? 'text-emerald-600' : 'text-red-500'}>
                    • One special character ({securitySettings.allowed_special_chars})
                  </li>
                </ul>
              </div>
            </div>
            <PasswordField
              placeholder="Confirm New Password"
              minLength={securitySettings.min_password_length}
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword(value => !value)}
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading || cooldownSecondsLeft > 0}
          className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : requiresPasswordChange ? 'Change Password and Continue' : 'Log In securely'}
        </button>

        {cooldownSecondsLeft > 0 && (
          <div className="text-sm text-center text-slate-500">
            Too many failed login attempts. Please try again in {cooldownSecondsLeft} second{cooldownSecondsLeft === 1 ? '' : 's'}.
          </div>
        )}

        {role === 'Voter' && !requiresPasswordChange && (
          <div className="pt-1 text-center text-sm text-slate-500">
            {returningVoterMode ? (
              <>
                First time logging in? Use your temporary password{' '}
                <button
                  type="button"
                  onClick={() => {
                    setReturningVoterMode(false);
                    setPassword('');
                    setError('');
                  }}
                  className="font-bold text-[var(--tenant-primary)] underline-offset-4 hover:underline"
                >
                  Enter 12345
                </button>
              </>
            ) : (
              <>
                Coming back as voter?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setReturningVoterMode(true);
                    setPassword('');
                    setError('');
                  }}
                  className="font-bold text-[var(--tenant-primary)] underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
