"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';

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

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('form');

  // ── Registration form state ──────────────────────────────────────────────────
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

  // ── OTP state ─────────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');
  const [otpHash, setOtpHash] = useState('');
  const [otpExpires, setOtpExpires] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // ── OTP countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Form submit: validate then send OTP
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setFormLoading(true);
    setIsSendingOtp(true);

    try {
      // Send OTP to the candidate's email
      const res = await fetch('/api/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, tenantId: tenant.id })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

      setOtpHash(data.hash);
      setOtpExpires(data.expires);
      setTimeLeft(90);
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
      setIsSendingOtp(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 — OTP verified → create account → auto-login → redirect
  // ─────────────────────────────────────────────────────────────────────────────
  const handleVerifyOtpAndRegister = async () => {
    if (!otp || otp.length !== 6) return;
    setError('');
    setIsVerifyingOtp(true);

    try {
      // 1. Verify OTP (no user creation)
      const verifyRes = await fetch('/api/verify_otp_only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp, hash: otpHash, expires: otpExpires })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'OTP verification failed.');

      // 2. Create candidate account
      const regRes = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/candidate-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed.');

      // 3. Auto-login
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

      // 4. Redirect to candidacy form
      window.location.href = `/${tenant.slug}/${election.slug}/file/candidacy-form`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP
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
      setTimeLeft(90);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

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

          <input
            required
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              required
              type="password"
              placeholder="Password"
              minLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <input
              required
              type="password"
              placeholder="Confirm Password"
              minLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all candidate-reg-input"
              value={formData.confirm}
              onChange={e => setFormData({ ...formData, confirm: e.target.value })}
            />
          </div>

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
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => { setStep('form'); setOtp(''); setError(''); }}
          className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 ml-2">Verify Your Email</h2>
      </div>

      {/* Icon + description */}
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

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium text-center">
          {error}
        </div>
      )}

      {/* OTP Input */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
        placeholder="• • • • • •"
        className="w-full text-center tracking-[0.6em] text-3xl font-bold rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none focus:border-[var(--tenant-primary)] transition-all placeholder:tracking-[0.4em] placeholder:text-slate-300 candidate-reg-input"
      />

      {/* Timer */}
      <div className="text-center text-sm">
        {timeLeft > 0 ? (
          <span className="text-slate-400">
            Code expires in{' '}
            <strong className="text-slate-600 tabular-nums">{timeLeft}s</strong>
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

      {/* Verify Button */}
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
