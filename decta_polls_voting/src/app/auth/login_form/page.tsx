'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GradientText from '../../../components/mainlanding/ui/GradientText.jsx';

type ForgotStep = 'idle' | 'email' | 'otp' | 'newPassword' | 'success';

export default function LogInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [superAdminPararms, setSuperAdminPararms] = useState('');

    // Forgot-password state
    const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
    const [fpEmail, setFpEmail] = useState('');
    const [fpError, setFpError] = useState('');
    const [fpLoading, setFpLoading] = useState(false);

    // OTP state
    const [otp, setOtp] = useState('');
    const [otpHash, setOtpHash] = useState('');
    const [otpExpires, setOtpExpires] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // New password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Memoized gradient colors to match landing page
    const gradientColors = useMemo(() => ["#5227FF", "#FF9FFC", "#B19EEF"], []);

    // Login helpers
    const isFormValid = email.trim() !== '' && password.trim() !== '';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isFormValid) {
            setError('Please provide appropriate credentials');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Check super admin credentials via server-side API (env vars are not accessible client-side)
            const superAdminRes = await fetch('/api/login_super_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (superAdminRes.ok) {
                const random = Math.random().toString(36).substring(2, 12);
                sessionStorage.setItem('adminToken', random);

                const params = new URLSearchParams();
                params.set('role', 'super_admin');
                params.set('random', random);

                // Navigate to loader page, then to super admin dashboard
                router.push('/loader?destination=' + encodeURIComponent('/users/super_admin/Dashboard?' + params.toString()));
                return;
            }

            // Not super admin — try tenant login
            const response = await fetch('/api/login_tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                setIsLoading(false);
                return;
            }

            // Store tenant token and email
            const random = Math.random().toString(36).substring(2, 12);
            sessionStorage.setItem('tenantToken', random);
            sessionStorage.setItem('tenantEmail', data.tenantEmail || email);
            if (data.tenantId) {
                sessionStorage.setItem('tenantUserId', data.tenantId);
            }

            // Fetch and store permissions cookie for middleware + PermissionProvider
            try {
                const permRes = await fetch('/api/get_user_permissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const permData = permRes.ok ? await permRes.json() : { permissions: [] };
                const permissions: string[] = permData.permissions ?? [];
                // Write cookie readable by middleware (server) and client
                const cookieValue = encodeURIComponent(JSON.stringify(permissions));
                document.cookie = `decta_permissions=${cookieValue}; path=/; SameSite=Strict`;
                document.cookie = `decta_role=${permData.role ?? 'tenant_user'}; path=/; SameSite=Strict`;
            } catch {
                // Non-fatal — middleware will redirect to login if cookie is missing
                console.warn('[login] Could not fetch permissions, proceeding without cookie');
            }

            const params = new URLSearchParams();
            params.set('role', 'tenant');
            params.set('random', random);

            // Navigate to loader page, then to tenant dashboard
            router.push('/loader?destination=' + encodeURIComponent('/users/tenant/dashboard?' + params.toString()));
        } catch (error: any) {
            setError(error.message || 'Login failed');
            setIsLoading(false);
            console.error('Login error:', error);
        }
    };

    // OTP countdown timer
    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(60);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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

    // Forgot password: verify OTP → proceed to new password
    const handleVerifyOtp = async () => {
        setFpLoading(true);
        setFpError('');
        try {
            if (Date.now() > otpExpires) {
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
        if (newPassword.length < 8) {
            setFpError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
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
                    newPassword,
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
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleMouseDown = () => {
        setShowPassword(true);
    };

    const handleMouseUp = () => {
        setShowPassword(false);
    };

    const handleMouseLeave = () => {
        setShowPassword(false);
    };

    return (
        <div
            className="min-h-screen w-full text-white overflow-x-hidden flex items-center justify-center p-4 md:p-8"
            style={{
                backgroundColor: '#03070f',
                backgroundImage: 'linear-gradient(180deg, #070b24 0%, #03070f 100%)',
            }}
        >
            <div className="flex flex-col md:flex-row w-full max-w-7xl items-center justify-between gap-12">

                {/* Left Side: Logo */}
                <div
                    className="flex w-full md:w-1/2 flex-col items-center justify-center py-12 md:py-24 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(54, 65, 181, 0.4) 0%, rgba(7, 11, 36, 0) 70%)',
                    }}
                >
                    <div className="relative w-40 h-40 md:w-80 md:h-80 transition-transform duration-700 hover:scale-105">
                        <Image
                            src="/DECTALogo/DECTAPolls_Logo.svg"
                            alt="DECTA Polls Logo"
                            fill
                            className="object-contain drop-shadow-[0_0_60px_rgba(93,68,248,0.5)]"
                            priority
                        />
                    </div>
                    <h1 className="mt-8 text-2xl md:text-4xl font-montserrat font-medium tracking-[0.3em] text-[#F1F0F3] text-center drop-shadow-md">
                        D.E.C.T.A POLLS
                    </h1>
                </div>

                {/* Right Side: Card */}
                <div className="flex w-full md:w-1/2 justify-center">

                    {/* FORGOT PASSWORD: Email Step */}
                    {forgotStep === 'email' && (
                        <div
                            className="w-full max-w-[540px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl relative"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            <h2 className="text-2xl font-semibold text-white mb-2 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Forgot Password
                            </h2>
                            <p className="text-white/60 mb-8 text-center text-sm">
                                Enter your account email and we&apos;ll send you a verification code.
                            </p>

                            {fpError && (
                                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                                    {fpError}
                                </div>
                            )}

                            <input
                                id="fp-email"
                                type="email"
                                value={fpEmail}
                                onChange={(e) => setFpEmail(e.target.value)}
                                placeholder="Email Address"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                                className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition mb-6 placeholder:text-white/30"
                            />

                            <button
                                id="fp-send-otp-btn"
                                onClick={handleSendOtp}
                                disabled={fpLoading || !fpEmail.trim()}
                                className={`w-full py-4 rounded-xl font-medium transition ${!fpLoading && fpEmail.trim()
                                    ? 'bg-[#5D44F8] text-white hover:bg-[#4a35cf] shadow-lg'
                                    : 'bg-[#334155] text-white/50 cursor-not-allowed'
                                    }`}
                            >
                                {fpLoading ? 'Sending...' : 'Send Verification Code'}
                            </button>

                            <div className="mt-8 text-center pt-6 border-t border-white/10">
                                <button onClick={handleCancelForgot} className="text-white/50 hover:text-white transition text-sm">
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FORGOT PASSWORD: OTP Step */}
                    {forgotStep === 'otp' && (
                        <div
                            className="w-full max-w-[540px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl relative"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            <h2 className="text-2xl font-semibold text-white mb-4 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Verify Your Email
                            </h2>
                            <p className="text-white/70 mb-8 text-center">
                                We&apos;ve sent a 6-digit code to <strong>{fpEmail}</strong>. It expires in 60s.
                            </p>

                            {fpError && (
                                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                                    {fpError}
                                </div>
                            )}

                            <input
                                id="fp-otp-input"
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="------"
                                className="w-full text-center tracking-[1em] text-3xl rounded-xl border border-white/30 bg-white/10 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition mb-8"
                                style={{ fontFamily: 'monospace' }}
                            />

                            <button
                                id="fp-verify-otp-btn"
                                onClick={handleVerifyOtp}
                                disabled={otp.length !== 6 || fpLoading || timeLeft === 0}
                                className={`w-full py-4 rounded-xl font-medium transition ${otp.length === 6 && !fpLoading && timeLeft > 0
                                    ? 'bg-[#5D44F8] text-white hover:bg-[#4a35cf] shadow-lg'
                                    : 'bg-[#334155] text-white/50 cursor-not-allowed'
                                    }`}
                            >
                                {fpLoading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <div className="mt-6 text-center text-sm">
                                {timeLeft > 0 ? (
                                    <span className="text-white/50">
                                        Resend code in <strong className="text-white/80">{timeLeft}s</strong>
                                    </span>
                                ) : (
                                    <button
                                        id="fp-resend-btn"
                                        onClick={handleResendOtp}
                                        disabled={fpLoading}
                                        className="text-[#5D44F8] hover:text-[#7f6af9] font-medium transition"
                                    >
                                        {fpLoading ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 text-center pt-6 border-t border-white/10">
                                <button onClick={handleCancelForgot} className="text-white/50 hover:text-white transition text-sm">
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FORGOT PASSWORD: New Password Step */}
                    {forgotStep === 'newPassword' && (
                        <div
                            className="w-full max-w-[540px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl relative"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            <h2 className="text-2xl font-semibold text-white mb-2 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Set New Password
                            </h2>
                            <p className="text-white/60 mb-8 text-center text-sm">
                                Create a strong new password for <strong className="text-white/80">{fpEmail}</strong>.
                            </p>

                            {fpError && (
                                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                                    {fpError}
                                </div>
                            )}

                            <div className="space-y-4 mb-8">
                                <input
                                    id="fp-new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New Password"
                                    className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition placeholder:text-white/30"
                                />
                                <input
                                    id="fp-confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                                    className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition placeholder:text-white/30"
                                />

                                {/* Password match indicator */}
                                {confirmPassword.length > 0 && (
                                    <p className={`text-xs text-center transition ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                    </p>
                                )}
                            </div>

                            <button
                                id="fp-reset-btn"
                                onClick={handleResetPassword}
                                disabled={
                                    fpLoading ||
                                    newPassword.length < 8 ||
                                    newPassword !== confirmPassword
                                }
                                className={`w-full py-4 rounded-xl font-medium transition ${!fpLoading && newPassword.length >= 8 && newPassword === confirmPassword
                                    ? 'bg-[#5D44F8] text-white hover:bg-[#4a35cf] shadow-lg'
                                    : 'bg-[#334155] text-white/50 cursor-not-allowed'
                                    }`}
                            >
                                {fpLoading ? 'Resetting...' : 'Reset Password'}
                            </button>

                            <div className="mt-8 text-center pt-6 border-t border-white/10">
                                <button onClick={handleCancelForgot} className="text-white/50 hover:text-white transition text-sm">
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FORGOT PASSWORD: Success Step */}
                    {forgotStep === 'success' && (
                        <div
                            className="w-full max-w-[540px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl relative text-center"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-3xl">
                                    ✓
                                </div>
                            </div>
                            <h2 className="text-2xl font-semibold text-white mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Password Reset!
                            </h2>
                            <p className="text-white/60 mb-8 text-sm">
                                Your password has been updated successfully. You can now log in with your new credentials.
                            </p>
                            <button
                                id="fp-back-to-login-btn"
                                onClick={handleCancelForgot}
                                className="w-full py-4 rounded-xl font-medium bg-[#5D44F8] text-white hover:bg-[#4a35cf] shadow-lg transition"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}

                    {/* LOGIN FORM (default) */}
                    {forgotStep === 'idle' && (
                        <div className="glass-card w-full max-w-md p-8 md:p-10">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
                            >
                                ← Back
                            </Link>

                            <div className="text-center">
                                <h1 className="text-3xl font-bold tracking-tight font-montserrat">
                                    <GradientText colors={gradientColors} animationSpeed={8}>
                                        Login
                                    </GradientText>
                                </h1>
                                <p className="mt-2 text-white/50 font-light font-source-sans">
                                    Welcome back! Your Election Awaits.
                                </p>
                            </div>

                            {error && (
                                <div className="mt-4 text-red-500 text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-[#5D44F8] focus:bg-white/10 placeholder:text-white/20 font-source-sans"
                                />

                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 pr-12 text-white outline-none transition focus:border-[#5D44F8] focus:bg-white/10 placeholder:text-white/20 font-source-sans"
                                    />
                                    <button
                                        type="button"
                                        onMouseDown={handleMouseDown}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseLeave}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors p-1"
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5C16.478 5 20.268 7.943 21.542 12C20.268 16.057 16.478 19 12 19C7.523 19 3.732 16.057 2.458 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <div className="flex justify-start">
                                    <button
                                        id="forgot-password-link"
                                        type="button"
                                        onClick={() => {
                                            setError('');
                                            setForgotStep('email');
                                        }}
                                        className="text-sm text-white/30 hover:text-[#d0c8ff] transition-colors font-source-sans"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    id="login-submit-btn"
                                    type="submit"
                                    disabled={!isFormValid || isLoading}
                                    className={`w-full rounded-xl py-4 text-lg font-semibold text-white transition-all duration-300 font-montserrat ${isFormValid && !isLoading
                                        ? 'bg-[#5D44F8] hover:bg-[#4c35d1] hover:shadow-[0_0_40px_rgba(93,68,248,0.4)] transform hover:-translate-y-1'
                                        : 'cursor-not-allowed bg-white/5 text-white/20'
                                        }`}
                                >
                                    {isLoading ? 'Loading...' : 'Login'}
                                </button>
                            </form>

                            <p className="mt-8 text-center text-sm text-white/40 font-source-sans">
                                New here?{' '}
                                <Link href="/auth/tenant_reg" className="font-semibold text-[#d0c8ff] hover:text-white transition-colors font-montserrat">
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}