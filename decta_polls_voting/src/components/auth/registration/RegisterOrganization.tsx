'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { RiImageAddLine, RiFileUploadLine, RiCheckLine } from "react-icons/ri";

// Added interface to handle the navigation back to plans
interface RegisterOrganizationProps {
  plan: string | null; // Receive the selected plan from the previous step
  onBack: () => void;
  onContinue: (data: any) => void; // NEW: Handler for the continue button
}

export default function RegisterOrganization({ plan, onBack, onContinue }: RegisterOrganizationProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [main_Color, setMainColor] = useState('');
  const [secondary_Color, setSecondaryColor] = useState('');
  const [error, setError] = useState('');

  const isFormValid =
    organizationName &&
    organizationType &&
    email &&
    tenantSlug &&
    verificationFile &&
    password &&
    confirmPassword;


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerificationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVerificationFile(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isFormValid) {
      setError('Please fill in all the required fields with the appropriate information');
      return;
    }
    else {
      setError('');
    }

    const payload = {
      organizationName,
      organizationType,
      email,
      plan,
      verificationFile,
      tenantSlug,
      main_Color,
      secondary_Color,
      password,
      logoFile,
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
        Register your Organization
      </h2>

      {/* The Form */}
      <form
        id="registration-form"
        onSubmit={handleSubmit}
        className="w-full max-w-[970px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl mb-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Logo Upload */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <label
              htmlFor="logo-upload"
              // Changed rounded-2xl to rounded-full
              className="flex h-56 w-56 cursor-pointer flex-col items-center justify-center rounded-full border border-dashed border-white/30 bg-white/8 text-center text-white/70 transition hover:bg-white/10"
            >
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Organization Logo"
                  width={180}
                  height={180}
                  // Ensure the image inside also remains a perfect circle
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-5xl"><RiImageAddLine /></span>
              )}
            </label>
            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <p className="text-base text-white/60 text-center max-w-[220px]">Upload your Logo</p>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block">
                <input required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Organization Name" className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]" />
              </label>
              <label className="block">
                <input required value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} placeholder="Organization Type" className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]" />
              </label>
            </div>
            <label className="block">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]" />
            </label>
            {/* Tenant Slug & Verification Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
              <div className="flex flex-col gap-4 w-full">
                {/* Tenant Slug Input */}
                <input required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Tenant Slug" className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none focus:border-[#5D44F8]" />

                {/* NEW: Verification Document Field */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="verification-upload"
                    className={`flex items-center gap-3 w-full rounded-lg border border-dashed px-4 py-3 cursor-pointer transition ${verificationFile ? 'border-green-500 bg-green-500/10' : 'border-white/30 bg-white/5 hover:bg-white/10'}`}
                  >
                    <span className={`text-xl ${verificationFile ? 'text-green-400' : 'text-white/70'}`}>
                      {verificationFile ? <RiCheckLine /> : <RiFileUploadLine />}
                    </span>
                    <span className="text-sm text-white/70 truncate">
                      {verificationFile ? verificationFile.name : "Upload Proof of Payment Document (PDF/Image)"}
                    </span>
                  </label>
                  <input id="verification-upload" type="file" accept=".pdf,image/*" className="hidden" onChange={handleVerificationUpload} />
                </div>
              </div>

              {/* Vertical Color Swatch Controls */}
              <div className="flex flex-col gap-3 mt-0">
                <div className="flex items-center gap-2 relative">
                  <input
                    id="color-value-1"
                    type="text"
                    className="w-28 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs text-white outline-none"
                    required value={main_Color} onChange={(e) => {
                      setMainColor (e.target.value);
                      const normalized = main_Color.startsWith('#') ? main_Color : `#${main_Color}`;
                      const swatch = document.getElementById('swatch-1') as HTMLDivElement | null;
                      const picker = document.getElementById('color-picker-1') as HTMLInputElement | null;
                      if (/^#?[0-9A-Fa-f]{6}$/.test(main_Color.replace('#', '')) && swatch) {
                        swatch.style.backgroundColor = normalized;
                        if (picker) picker.value = normalized;
                      }
                    }}
                  />
                  <div
                    id="swatch-1"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/30 bg-[#5f1b1b] cursor-pointer"
                    onClick={() => document.getElementById('color-picker-1')?.click()}
                  />
                  <input 
                    id="color-picker-1" 
                    type="color" 
                    className="absolute right-0 opacity-0 pointer-events-none w-10 h-10" 
                    required value={main_Color} onChange={(e) => {
                      setMainColor (e.target.value);
                      const swatch = document.getElementById('swatch-1') as HTMLDivElement | null;
                      const text = document.getElementById('color-value-1') as HTMLInputElement | null;
                      if (swatch) swatch.style.backgroundColor = main_Color;
                      if (text) text.value = main_Color;
                    }} 
                  />
                </div>

                <div className="flex items-center gap-2 relative">
                  <input
                    id="color-value-2"
                    type="text"
                    className="w-28 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs text-white outline-none"
                    required value={secondary_Color} onChange={(e) => {
                      setSecondaryColor (e.target.value);
                      const normalized = secondary_Color.startsWith('#') ? secondary_Color : `#${secondary_Color}`;
                      const swatch = document.getElementById('swatch-2') as HTMLDivElement | null;
                      const picker = document.getElementById('color-picker-2') as HTMLInputElement | null;
                      if (/^#?[0-9A-Fa-f]{6}$/.test(secondary_Color.replace('#', '')) && swatch) {
                        swatch.style.backgroundColor = normalized;
                        if (picker) picker.value = normalized;
                      }
                    }}
                  />
                  <div
                    id="swatch-2"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/30 bg-[#000000] cursor-pointer"
                    onClick={() => document.getElementById('color-picker-2')?.click()}
                  />
                  <input 
                    id="color-picker-2" 
                    type="color" 
                    className="absolute right-0 opacity-0 pointer-events-none w-10 h-10" 
                    required value={secondary_Color} onChange={(e) => {
                      setSecondaryColor (e.target.value);
                      const swatch = document.getElementById('swatch-2') as HTMLDivElement | null;
                      const text = document.getElementById('color-value-2') as HTMLInputElement | null;
                      if (swatch) swatch.style.backgroundColor = secondary_Color;
                      if (text) text.value = secondary_Color;
                    }} 
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block">
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]" />
              </label>
              <label className="block">
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8]" />
              </label>
            </div>
            {error && (
              <div className="mt-4 text-red-500 text-center">
                {error}
              </div>
            )}
          </div>
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
          style={{
            display: 'flex',
            width: '340px',
            padding: '20px 10px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '20px',
            border: '1px solid #372892',
            background: '#5D44F8',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: 1,
            boxShadow: '0 10px 25px -5px rgba(93, 68, 248, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}