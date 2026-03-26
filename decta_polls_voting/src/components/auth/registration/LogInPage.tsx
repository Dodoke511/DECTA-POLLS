'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function LogInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;
    console.log('login', { email, password });
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
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10 shadow-2xl backdrop-blur-3xl">
            <Link 
              href="#" 
              className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
            >
              ← Back
            </Link>
            
            <div className="text-center">
            <h1 className="text-3xl font-bold text-[#d0c8ff] tracking-tight">
                Login
            </h1>
            <p className="mt-2 text-white/50 font-light">
                Welcome back! Your Election Awaits.
            </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-[#5D44F8] focus:bg-white/10 placeholder:text-white/20"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-[#5D44F8] focus:bg-white/10 placeholder:text-white/20"
              />

              <div className="flex justify-start">
                <Link href="#" className="text-sm text-white/30 hover:text-[#d0c8ff] transition-colors">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-full rounded-xl py-4 text-lg font-semibold text-white transition-all duration-300 ${
                  isFormValid 
                    ? 'bg-[#5D44F8] hover:bg-[#4c35d1] hover:shadow-[0_0_40px_rgba(93,68,248,0.4)] transform hover:-translate-y-1' 
                    : 'cursor-not-allowed bg-white/5 text-white/20'
                }`}
              >
                Login
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/40">
              New here?{' '}
              <Link href="#" className="font-semibold text-[#d0c8ff] hover:text-white transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}