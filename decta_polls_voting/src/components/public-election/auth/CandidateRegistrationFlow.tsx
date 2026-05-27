"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SECURITY_SETTINGS, validatePassword } from '@/lib/security';

interface Props {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

type Step = 'form' | 'otp';

export function CandidateRegistrationFlow({ onBack, onSwitchToLogin }: Props) {
  const { tenant, election } = useElectionPublic();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [step, setStep] = useState<Step>('form');

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    contact: '',
    birthDate: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securitySettings, setSecuritySettings] = useState(DEFAULT_SECURITY_SETTINGS);

  const [otp, setOtp] = useState('');
  const [otpHash, setOtpHash] = useState('');
  const [otpExpires, setOtpExpires] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const passwordPolicy = useMemo(
    () => validatePassword(formData.password, securitySettings),
    [formData.password, securitySettings]
  );

  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

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
        console.warn('[CandidateRegistrationFlow] failed to load security settings', err);
      }
    };
    fetchSettings();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!passwordPolicy.valid) {
      setError(passwordPolicy.errors[0] || 'Please choose a stronger password.');
      return;
    }

    setFormLoading(true);
    setIsSendingOtp(true);

    try {
      const res = await fetch('/api/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, tenantId: tenant.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
      setOtpHash(data.hash);
      setOtpExpires(data.expires);
      setTimeLeft(60);
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndRegister = async () => {
    if (!otp || otp.length !== 6) return;
    setError('');
    setIsVerifyingOtp(true);

    try {
      const verifyRes = await fetch('/api/verify_otp_only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp, hash: otpHash, expires: otpExpires })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'OTP verification failed.');

      const regRes = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/candidate-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed.');

      const loginRes = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const loginData = await loginRes.json();

      if (loginData.session) {
        await supabase.auth.setSession(loginData.session);
        document.cookie = `sb-access-token=${loginData.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      window.location.href = `/${tenant.slug}/${election.slug}/file/candidacy-form`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setOtp('');
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code.');
      setOtpHash(data.hash);
      setOtpExpires(data.expires);
      setTimeLeft(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ── Shared SVG Icons ─────────────────────────────────────────────────────────
  const EyeIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Step 1: Registration Form
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 ml-2">Candidate Registration</h2>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
          {/* Scope a style override to bypass the global input hover text color bug */}
          <style>{`
            input.candidate-reg-input:hover,
            input.candidate-reg-input:focus,
            input.candidate-reg-input:active,
            input[type="text"].candidate-reg-input:hover,
            input[type="text"].candidate-reg-input:focus,
            input[type="text"].candidate-reg-input:active {
              color: #0f172a !important;
              -webkit-text-fill-color: #0f172a !important;
            }
          `}</style>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Name Row */}
          <div className="grid grid-cols-3 gap-4">
            <input
              required
              placeholder="First Name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              placeholder="Middle Name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
              value={formData.middleName}
              onChange={e => setFormData({ ...formData, middleName: e.target.value })}
            />
            <input
              required
              placeholder="Last Name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          {/* DOB + Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Birth</label>
              <input
                required
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
                value={formData.birthDate}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contact Number</label>
              <input
                required
                placeholder="e.g. 09123456789"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <input
            required
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          {/* ── Password Row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Password Field */}
            <div className="group relative flex items-center gap-2">

              <div className="absolute bottom-full left-0 mb-2 z-50 w-[240px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-xl pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                <p className="font-semibold mb-2 text-xs text-slate-700">Password Requirements</p>
                <ul className="space-y-1 text-xs">
                  <li className={passwordPolicy.checks.length ? 'text-emerald-600' : 'text-red-500'}>
                    • At least {securitySettings.min_password_length} characters
                  </li>
                  <li className={passwordPolicy.checks.uppercase ? 'text-emerald-600' : 'text-red-500'}>
                    • One uppercase letter (A–Z)
                  </li>
                  <li className={passwordPolicy.checks.lowercase ? 'text-emerald-600' : 'text-red-500'}>
                    • One lowercase letter (a–z)
                  </li>
                  <li className={passwordPolicy.checks.number ? 'text-emerald-600' : 'text-red-500'}>
                    • One number (0–9)
                  </li>
                  <li className={passwordPolicy.checks.special ? 'text-emerald-600' : 'text-red-500'}>
                    • One special character ({securitySettings.allowed_special_chars})
                  </li>
                </ul>
              </div>

              {/* Input — shrinks left on hover to reveal only the eye icon on the right */}
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all duration-300"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />

              {/* Eye toggle only — slides in from the right */}
              <div className="flex items-center overflow-hidden max-w-0 group-hover:max-w-[40px] transition-all duration-300 ease-in-out flex-shrink-0">
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-white hover:opacity-90 transition flex-shrink-0"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="group flex items-center gap-1.5">

              {/* Eye icon — slides in from the left */}
              <div className="flex items-center overflow-hidden max-w-0 group-hover:max-w-[32px] transition-all duration-300 ease-in-out flex-shrink-0">
                <button
                  type="button"
                  onMouseDown={() => setShowConfirmPassword(true)}
                  onMouseUp={() => setShowConfirmPassword(false)}
                  onMouseLeave={() => setShowConfirmPassword(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-white hover:opacity-90 transition flex-shrink-0"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Input — slides right on hover as icon expands from the left */}
              <input
                required
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all duration-300"
                value={formData.confirm}
                onChange={e => setFormData({ ...formData, confirm: e.target.value })}
              />
            </div>

          </div>
          {/* ── End Password Row ──────────────────────────────────────────────── */}

          {/* Submit */}
          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90 text-slate-950 font-bold py-3.5 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2"
          >
            {formLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Verification Code...
              </>
            ) : (
              'Create Account & Continue'
            )}
          </button>

          <p className="text-center mt-6 text-sm text-slate-500">
            Already have an account?
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[var(--tenant-primary)] font-bold hover:underline ml-1"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Step 2: OTP Verification
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => { setStep('form'); setOtp(''); setError(''); }}
          className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 ml-2">Verify Your Email</h2>
      </div>

      <div className="flex flex-col items-center text-center py-4 gap-3">
        {/* Scope a style override to bypass the global input hover text color bug inside OTP screen */}
        <style>{`
          input.candidate-reg-input:hover,
          input.candidate-reg-input:focus,
          input.candidate-reg-input:active,
          input[type="text"].candidate-reg-input:hover,
          input[type="text"].candidate-reg-input:focus,
          input[type="text"].candidate-reg-input:active {
            color: #0f172a !important;
            -webkit-text-fill-color: #0f172a !important;
          }
        `}</style>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--tenant-primary)]/10 via-[var(--tenant-third)]/15 to-[var(--tenant-secondary)]/20 flex items-center justify-center border border-[var(--tenant-secondary)]/25">
          <MailCheck className="w-7 h-7 text-[var(--tenant-primary)]" />
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          We sent a <strong className="text-slate-700">6-digit verification code</strong> to{' '}
          <strong className="text-slate-700">{formData.email}</strong>.
          <br />
          Enter it below to complete your registration.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium text-center">
          {error}
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
        placeholder="• • • • • •"
        className="w-full text-center tracking-[0.6em] text-3xl font-bold rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none focus:border-[var(--tenant-primary)] transition-all placeholder:tracking-[0.4em] placeholder:text-slate-300 candidate-reg-input"
      />

      <div className="text-center text-sm">
        {timeLeft > 0 ? (
          <span className="text-slate-400">
            Code expires in <strong className="text-slate-600 tabular-nums">{timeLeft}s</strong>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isSendingOtp}
            className="text-[var(--tenant-primary)] font-semibold hover:underline transition disabled:opacity-50"
          >
            {isSendingOtp ? 'Sending...' : 'Resend Code'}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleVerifyOtpAndRegister}
        disabled={otp.length !== 6 || isVerifyingOtp || timeLeft === 0}
        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          otp.length === 6 && !isVerifyingOtp && timeLeft > 0
            ? 'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90 text-slate-950 shadow-md hover:shadow-lg'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isVerifyingOtp ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            Verify & Register
          </>
        )}
      </button>
    </div>
  );
}