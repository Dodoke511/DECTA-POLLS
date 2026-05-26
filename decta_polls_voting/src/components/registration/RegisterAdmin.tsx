'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface RegisterAdminProps {
  plan: string | null;
  onBack: () => void;
  onContinue: (data: any) => void;
}

export default function RegisterAdmin({ plan, onBack, onContinue }: RegisterAdminProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [showEmailError, setShowEmailError] = useState(false);
  const [emailError, setEmailError] = useState('');

  const today = new Date();
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    birthDate.trim() &&
    email.trim() &&
    contactNumber.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    try {
      const res = await fetch('/api/check_email_exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.existsNonAdmin) {
          setEmailError('Email is already registered as a voter or candidate');
          setShowEmailError(true);
          setTimeout(() => setShowEmailError(false), 4000);
          return;
        }
        if (json.existsAdmin) {
          setEmailError('Email address already registered with another admin');
          setShowEmailError(true);
          setTimeout(() => setShowEmailError(false), 4000);
          return;
        }
      }
    } catch (err) {
      console.warn('[RegisterAdmin] Email existence check failed', err);
    }

    if (birthDate > eighteenYearsAgo.toISOString().split('T')[0]) {
      setError('You must be at least 18 years old');
      return;
    }
    if (contactNumber.length <= 10) {
      setError('Contact Number must be at least 11 digits');
      return;
    }

    setError('');
    onContinue({ firstName, lastName, middleName, birthDate, email: normalizedEmail, contactNumber });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)',
        fontFamily: 'Poppins, Inter, sans-serif',
      }}
    >
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Image
              src="/DECTALogo/DECTAPolls_Logo.svg"
              alt="DECTA Polls Logo"
              width={60}
              height={60}
            />
            <h1 className="text-[#F1F0F3] font-montserrat text-2xl font-medium m-0">
              D.E.C.T.A Polls
            </h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mr-8"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-32">
        {/* Title */}
        <h2 className="text-white font-light text-center tracking-tight max-w-2xl text-3xl font-montserrat mb-8">
          Admin Registration
        </h2>

        {/* The Form */}
        <form
          id="registration-form"
          onSubmit={handleSubmit}
          className="glass-card w-full max-w-[640px] p-8 mb-6"
        >
          <div className="grid grid-cols-1 gap-4">

            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block text-white/90 text-sm font-medium font-source-sans">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  required
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans"
                />
              </label>
              <label className="block text-white/90 text-sm font-medium font-source-sans">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  required
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans"
                />
              </label>
            </div>

            {/* Middle Name & Birth Date */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block text-white/90 text-sm font-medium font-source-sans">
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle Name"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans"
                />
              </label>
              <label className="block text-white/90 text-sm font-medium font-source-sans">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans [color-scheme:dark]"
                  style={{
                    color: birthDate ? 'white' : 'rgba(255,255,255,0.5)',
                    colorScheme: 'dark',
                  }}
                />
              </label>
            </div>

            {/* Email Address — with inline fade error */}
            <label className="block text-white/90 text-sm font-medium font-source-sans relative pb-6">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (showEmailError) setShowEmailError(false);
                }}
                placeholder="Email Address"
                required
                className={`mt-2 w-full rounded-lg border bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans ${
                  showEmailError ? 'border-yellow-400/60' : 'border-white/30'
                }`}
              />
              {/* Fade-in/out error — sits directly below the field */}
              <span
                className={`absolute left-0 bottom-0 text-xs text-yellow-300 transition-all duration-500 ${
                  showEmailError
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {emailError}
              </span>
            </label>

            {/* Contact Number */}
            <label className="block text-white/90 text-sm font-medium font-source-sans">
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Contact Number"
                required
                className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans"
              />
            </label>

            {/* General error */}
            {error && (
              <p className="text-red-400 text-sm font-source-sans">{error}</p>
            )}

          </div>
        </form>

        {/* Submit Button */}
        <button
          type="submit"
          form="registration-form"
          disabled={!isFormValid}
          className={`inline-flex items-center justify-center px-8 py-0 h-12 rounded-xl font-montserrat text-white text-xl font-semibold transition-all duration-300 leading-tight ${
            isFormValid
              ? 'cursor-pointer bg-[#5D44F8] hover:bg-[#4c35d1] hover:shadow-[0_0_40px_rgba(93,68,248,0.4)] hover:-translate-y-1'
              : 'cursor-not-allowed bg-white/5 text-white/20'
          }`}
          style={{
            border: 'none',
            boxShadow: isFormValid ? '0 4px 12px rgba(93, 68, 248, 0.3)' : 'none',
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}