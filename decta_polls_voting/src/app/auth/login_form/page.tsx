'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GradientText from '../../../components/mainlanding/ui/GradientText.jsx';

export default function LogInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Memoized gradient colors to match landing page
    const gradientColors = useMemo(() => ["#5227FF", "#FF9FFC", "#B19EEF"], []);

    const isFormValid = email.trim() !== '' && password.trim() !== '';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isFormValid) {
            setError('Please provide appropriate credentials');
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await fetch('/api/login_tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                setIsLoading(false);
                return;
            }

            // Navigate to loading page, then to tenant dashboard
            router.push('/loading?destination=/users/tenant');
        } catch (error: any) {
            setError(error.message || 'Login failed');
            setIsLoading(false);
            console.error('Login error:', error);
        }
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
                // Global deep background
                backgroundColor: '#03070f',
                backgroundImage: 'linear-gradient(180deg, #070b24 0%, #03070f 100%)',
            }}
        >
            <div className="flex flex-col md:flex-row w-full max-w-7xl items-center justify-between gap-12">

                {/* Left Side: Logo with its OWN glow */}
                <div
                    className="flex w-full md:w-1/2 flex-col items-center justify-center py-12 md:py-24 rounded-full"
                    style={{
                        // The glow is now "pinned" to the logo area
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

                {/* Right Side: Login Form (Floating) */}
                <div className="flex w-full md:w-1/2 justify-center">
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
                                            <path d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5C16.478 5 20.268 7.943 21.542 12C20.268 16.057 16.478 19 12 19C7.523 19 3.732 16.057 2.458 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="flex justify-start">
                                <Link href="#" className="text-sm text-white/30 hover:text-[#d0c8ff] transition-colors font-source-sans">
                                    Forgot Password?
                                </Link>
                            </div>

                            <button
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
                </div>
            </div>
        </div>
    );
}