'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// Added interface to handle the navigation back to plans
interface RegisterOrganizationProps {
  plan: string | null; // Receive the selected plan from the previous step
  onBack: () => void;
  onContinue: (data: any) => void; // NEW: Handler for the continue button
}

export default function RegisterAdmin({ onBack, onContinue }: RegisterOrganizationProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    contactNumber.trim();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    const payload = {
      firstName,
      lastName,
      middleName,
      email,
      contactNumber,
    };

    onContinue(payload);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)',
        fontFamily: 'Poppins, Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 lg:absolute lg:top-10 lg:left-10 lg:mb-0">
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

      {/* Title */}
      <h2 
        className="text-white font-light text-center tracking-tight max-w-2xl"
        style={{
          fontSize: '30px', 
          color: '#ffffff',
          marginBottom: '30px',
          fontFamily: 'Montserrat, sans-serif',
          letterSpacing: '1px',
          wordSpacing: '2px',
        }}
      >
        Admin Registration
      </h2>

      {/* The Form */}
      <form
        id="registration-form"
        onSubmit={handleSubmit}
        className="w-full max-w-[640px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl mb-10"
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="block text-white/90 text-sm font-medium">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
                className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]"
              />
            </label>
            <label className="block text-white/90 text-sm font-medium">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                required
                className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]"
              />
            </label>
          </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="block text-white/90 text-sm font-medium">
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle Name"
                required
                className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]"
              />
            </label>
          </div>
          <label className="block text-white/90 text-sm font-medium">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]"
            />
          </label>

          <label className="block text-white/90 text-sm font-medium">
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Contact Number"
              required
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]"
            />
          </label>
        </div>
      </form>
      {/* Button Container */}
      <div className="flex flex-row items-center gap-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            width: '160px',
            padding: '20px 10px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '20px',
            border: '1px solid rgba(93, 68, 248, 0.4)', // Slightly visible purple border
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Smoother transition
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(93, 68, 248, 0.15)';
            e.currentTarget.style.borderColor = '#5D44F8';
            e.currentTarget.style.transform = 'translateY(-3px)';
            // Layered shadow to create the "Neon" effect from your image
            e.currentTarget.style.boxShadow = `
              0 0 10px rgba(93, 68, 248, 0.5), 
              0 0 30px rgba(93, 68, 248, 0.3), 
              0 0 50px rgba(93, 68, 248, 0.1)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(93, 68, 248, 0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(93, 68, 248, 0.7)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1)';
          }}
        >
          ← Back
        </button>

        {/* Continue Button */}
        <button
          type="submit"
          form="registration-form"
          disabled={!isFormValid}
          style={{
            display: 'flex',
            width: '340px',
            padding: '20px 10px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '20px',
            border: '1px solid #372892',
            background: isFormValid ? '#5D44F8' : '#334155',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            opacity: isFormValid ? 1 : 0.6,
            boxShadow: isFormValid ? '0 10px 25px -5px rgba(93, 68, 248, 0.4)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (isFormValid) e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            if (isFormValid) e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}