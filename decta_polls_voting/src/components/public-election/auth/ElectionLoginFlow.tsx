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

  // Forgot-password state
  const [forgotStep, setForgotStep] = useState<'idle' | 'email' | 'otp' | 'newPassword' | 'success'>('idle');
  const [fpEmail, setFpEmail] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpHash, setOtpHash] = useState('');
  const [otpExpires, setOtpExpires] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New password state for forgot-password
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [showFpNewPassword, setShowFpNewPassword] = useState(false);
  const [showFpConfirmPassword, setShowFpConfirmPassword] = useState(false);

  const newPasswordPolicy = useMemo(
    () => validatePassword(newPassword, securitySettings),
    [newPassword, securitySettings]
  );

  const fpNewPasswordPolicy = useMemo(
    () => validatePassword(fpNewPassword, securitySettings),
    [fpNewPassword, securitySettings]
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

  useEffect(() => {
    if (cooldownSecondsLeft === 0 && error.toLowerCase().includes('too many failed login attempts')) {
      setError('');
    }
  }, [cooldownSecondsLeft, error]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // OTP countdown timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Forgot password: send OTP
  const handleSendOtp = async () => {
    if (!fpEmail.trim()) {
      setFpError('Please enter your email address.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      const res = await fetch('/api/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFpError(data.error || 'Failed to send OTP. Try again.');
        return;
      }
      setOtpHash(data.hash);
      setOtpExpires(data.expires);
      setOtp('');
      setForgotStep('otp');
      startTimer();
    } catch (err: any) {
      setFpError(err.message || 'Failed to send OTP.');
    } finally {
      setFpLoading(false);
    }
  };

  // Forgot password: resend OTP
  const handleResendOtp = async () => {
    setFpLoading(true);
    setFpError('');
    try {
      const res = await fetch('/api/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFpError(data.error || 'Failed to resend OTP.');
        return;
      }
      setOtpHash(data.hash);
      setOtpExpires(data.expires);
      setOtp('');
      startTimer();
    } catch (err: any) {
      setFpError(err.message || 'Failed to resend OTP.');
    } finally {
      setFpLoading(false);
    }
  };

  // Forgot password: verify OTP
  const handleVerifyOtp = async () => {
    setFpLoading(true);
    setFpError('');
    try {
      if (timeLeft === 0) {
        setFpError('OTP has expired. Please request a new code.');
        setFpLoading(false);
        return;
      }
      setForgotStep('newPassword');
    } catch (err: any) {
      setFpError(err.message || 'Verification failed.');
    } finally {
      setFpLoading(false);
    }
  };

  // Forgot password: submit new password
  const handleResetPassword = async () => {
    const policy = validatePassword(fpNewPassword, securitySettings);
    if (!policy.valid) {
      setFpError(policy.errors[0] || 'Password does not meet security requirements.');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Passwords do not match.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      const res = await fetch('/api/reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fpEmail,
          newPassword: fpNewPassword,
          otp,
          hash: otpHash,
          expires: otpExpires,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFpError(data.error || 'Failed to reset password.');
        return;
      }
      setForgotStep('success');
    } catch (err: any) {
      setFpError(err.message || 'Failed to reset password.');
    } finally {
      setFpLoading(false);
    }
  };

  // Reset all forgot-password state
  const handleCancelForgot = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setForgotStep('idle');
    setFpEmail('');
    setFpError('');
    setOtp('');
    setOtpHash('');
    setOtpExpires(0);
    setTimeLeft(60);
    setFpNewPassword('');
    setFpConfirmPassword('');
  };

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

  if (forgotStep === 'email') {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button onClick={handleCancelForgot} className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 ml-2">
            Forgot Password
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Enter your account email and we&apos;ll send you a verification code.
          </p>

          {fpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {fpError}
            </div>
          )}

          <input
            required
            id="fp-email"
            type="email"
            placeholder="Email Address"
            className="public-election-auth-input w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
            value={fpEmail}
            onChange={(e) => setFpEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fpEmail.trim() && handleSendOtp()}
          />

          <button
            id="fp-send-otp-btn"
            onClick={handleSendOtp}
            disabled={fpLoading || !fpEmail.trim()}
            className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
          </button>

          <div className="pt-2 text-center">
            <button onClick={handleCancelForgot} className="text-sm font-semibold text-[var(--tenant-primary)] hover:underline">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (forgotStep === 'otp') {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button onClick={() => setForgotStep('email')} className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 ml-2">
            Verify Your Email
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            We&apos;ve sent a 6-digit code to <strong className="text-slate-800">{fpEmail}</strong>. It expires in 60s.
          </p>

          {fpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {fpError}
            </div>
          )}

          <input
            required
            id="fp-otp-input"
            type="text"
            maxLength={6}
            placeholder="------"
            className="w-full text-center tracking-[1em] text-3xl bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
            style={{ fontFamily: 'monospace' }}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />

          <button
            id="fp-verify-otp-btn"
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || fpLoading || timeLeft === 0}
            className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
          </button>

          <div className="text-center text-sm text-slate-500 pt-2">
            {timeLeft > 0 ? (
              <span>
                Resend code in <strong className="text-slate-800">{timeLeft}s</strong>
              </span>
            ) : (
              <button
                id="fp-resend-btn"
                onClick={handleResendOtp}
                disabled={fpLoading}
                className="font-bold text-[var(--tenant-primary)] hover:underline"
              >
                {fpLoading ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <div className="pt-2 text-center">
            <button onClick={handleCancelForgot} className="text-sm font-semibold text-[var(--tenant-primary)] hover:underline">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (forgotStep === 'newPassword') {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button onClick={() => setForgotStep('otp')} className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 ml-2">
            Set New Password
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Create a strong new password for <strong className="text-slate-800">{fpEmail}</strong>.
          </p>

          {fpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {fpError}
            </div>
          )}

          <div className="group relative">
            <PasswordField
              placeholder="New Password"
              minLength={securitySettings.min_password_length}
              value={fpNewPassword}
              onChange={setFpNewPassword}
              visible={showFpNewPassword}
              onToggleVisible={() => setShowFpNewPassword((v) => !v)}
            />
            <div className="absolute bottom-full left-0 mb-2 z-50 w-[240px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-xl pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
              <p className="font-semibold mb-2 text-xs text-slate-700">Password Requirements</p>
              <ul className="space-y-1 text-xs">
                <li className={fpNewPasswordPolicy.checks.length ? 'text-emerald-600' : 'text-red-500'}>
                  • At least {securitySettings.min_password_length} characters
                </li>
                <li className={fpNewPasswordPolicy.checks.uppercase ? 'text-emerald-600' : 'text-red-500'}>
                  • One uppercase letter (A–Z)
                </li>
                <li className={fpNewPasswordPolicy.checks.lowercase ? 'text-emerald-600' : 'text-red-500'}>
                  • One lowercase letter (a–z)
                </li>
                <li className={fpNewPasswordPolicy.checks.number ? 'text-emerald-600' : 'text-red-500'}>
                  • One number (0–9)
                </li>
                <li className={fpNewPasswordPolicy.checks.special ? 'text-emerald-600' : 'text-red-500'}>
                  • One special character ({securitySettings.allowed_special_chars})
                </li>
              </ul>
            </div>
          </div>

          <PasswordField
            placeholder="Confirm Password"
            minLength={securitySettings.min_password_length}
            value={fpConfirmPassword}
            onChange={setFpConfirmPassword}
            visible={showFpConfirmPassword}
            onToggleVisible={() => setShowFpConfirmPassword((v) => !v)}
          />

          {fpConfirmPassword.length > 0 && (
            <p className={`text-xs text-center font-medium transition ${fpNewPassword === fpConfirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
              {fpNewPassword === fpConfirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}

          <button
            id="fp-reset-btn"
            onClick={handleResetPassword}
            disabled={
              fpLoading ||
              fpNewPassword.length < securitySettings.min_password_length ||
              fpNewPassword !== fpConfirmPassword
            }
            className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>

          <div className="pt-2 text-center">
            <button onClick={handleCancelForgot} className="text-sm font-semibold text-[var(--tenant-primary)] hover:underline">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (forgotStep === 'success') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Password Reset!
          </h2>
          <p className="text-slate-600 text-sm px-4">
            Your password has been updated successfully. You can now log in with your new credentials.
          </p>

          <button
            id="fp-back-to-login-btn"
            onClick={handleCancelForgot}
            className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

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
            {(role === 'Candidate' || returningVoterMode) && (
              <div className="flex justify-end pt-1">
                <button
                  id="forgot-password-link"
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotStep('email');
                    setFpEmail(email);
                  }}
                  className="text-sm font-semibold text-[var(--tenant-primary)] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}
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
