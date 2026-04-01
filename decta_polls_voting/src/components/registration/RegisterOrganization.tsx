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
  const [main_Color, setMainColor] = useState('#FFFFFF');
  const [secondary_Color, setSecondaryColor] = useState('#FFFFFF');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      className="relative min-h-screen w-full"
      style={{
        background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Header - Fixed at top */}
      <header className="w-full p-6 md:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/DECTALogo/DECTAPolls_Logo.svg" alt="Logo" width={60} height={60} />
            <h1 className="text-[#F1F0F3] font-montserrat text-2xl font-medium m-0">D.E.C.T.A Polls</h1>
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

      {/* Body - Main content area */}
      <main className="flex flex-col items-center justify-center px-6 md:px-10 pb-10 pt-0">
        <h2 className="text-white font-light text-center tracking-tight max-w-2xl text-3xl font-montserrat mb-8">
          Register your Organization
        </h2>

        {/* The Form */}
        <form
          id="registration-form"
          onSubmit={handleSubmit}
          className="glass-card w-full max-w-[970px] p-10 mb-10"
        >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Logo Upload */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <label
              htmlFor="logo-upload"
              className="flex h-56 w-56 cursor-pointer flex-col items-center justify-center rounded-full border border-dashed border-white/30 bg-white/8 text-center text-white/70 transition hover:bg-white/10"
            >
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Organization Logo"
                  width={180}
                  height={180}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-5xl"><RiImageAddLine /></span>
              )}
            </label>
            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <p className="text-base text-white/60 text-center max-w-[220px] font-source-sans">Upload your Logo</p>
          </div>

          {/* Inputs */}
          <div className="space-y-5">
            {/* Organization Name and Type - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <input required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Organization Name" className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans" />
              <input required value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} placeholder="Organization Type" className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans" />
            </div>

            {/* Email Address - Full Width */}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#5D44F8] font-source-sans" />

            {/* Tenant Slug and Color Pickers - Same Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
              <input required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Tenant Slug" className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white outline-none focus:border-[#5D44F8] font-source-sans" />

              {/* Horizontal Color Swatch Controls */}
              <div className="flex flex-row gap-3">
                <div className="flex items-center gap-2 relative">
                  <input
                    id="color-value-1"
                    type="text"
                    placeholder="#FFFFFF"
                    className="w-20 rounded-lg border border-white/30 bg-white/10 px-2 py-2.5 text-xs text-white outline-none font-source-sans"
                    value={main_Color} 
                    onChange={(e) => {
                      setMainColor(e.target.value);
                      const normalized = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      const swatch = document.getElementById('swatch-1') as HTMLDivElement | null;
                      const picker = document.getElementById('color-picker-1') as HTMLInputElement | null;
                      if (/^#?[0-9A-Fa-f]{6}$/.test(e.target.value.replace('#', '')) && swatch) {
                        swatch.style.backgroundColor = normalized;
                        if (picker) picker.value = normalized;
                      }
                    }}
                  />
                  <div
                    id="swatch-1"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/30 cursor-pointer"
                    style={{ backgroundColor: main_Color || '#FFFFFF' }}
                    onClick={() => document.getElementById('color-picker-1')?.click()}
                  />
                  <input 
                    id="color-picker-1" 
                    type="color" 
                    className="absolute right-0 opacity-0 pointer-events-none w-10 h-10" 
                    value={main_Color} 
                    onChange={(e) => {
                      setMainColor(e.target.value);
                      const swatch = document.getElementById('swatch-1') as HTMLDivElement | null;
                      const text = document.getElementById('color-value-1') as HTMLInputElement | null;
                      if (swatch) swatch.style.backgroundColor = e.target.value;
                      if (text) text.value = e.target.value;
                    }} 
                  />
                </div>

                <div className="flex items-center gap-2 relative">
                  <input
                    id="color-value-2"
                    type="text"
                    placeholder="#FFFFFF"
                    className="w-20 rounded-lg border border-white/30 bg-white/10 px-2 py-2.5 text-xs text-white outline-none font-source-sans"
                    value={secondary_Color} 
                    onChange={(e) => {
                      setSecondaryColor(e.target.value);
                      const normalized = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      const swatch = document.getElementById('swatch-2') as HTMLDivElement | null;
                      const picker = document.getElementById('color-picker-2') as HTMLInputElement | null;
                      if (/^#?[0-9A-Fa-f]{6}$/.test(e.target.value.replace('#', '')) && swatch) {
                        swatch.style.backgroundColor = normalized;
                        if (picker) picker.value = normalized;
                      }
                    }}
                  />
                  <div
                    id="swatch-2"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/30 cursor-pointer"
                    style={{ backgroundColor: secondary_Color || '#FFFFFF' }}
                    onClick={() => document.getElementById('color-picker-2')?.click()}
                  />
                  <input 
                    id="color-picker-2" 
                    type="color" 
                    className="absolute right-0 opacity-0 pointer-events-none w-10 h-10" 
                    value={secondary_Color} 
                    onChange={(e) => {
                      setSecondaryColor(e.target.value);
                      const swatch = document.getElementById('swatch-2') as HTMLDivElement | null;
                      const text = document.getElementById('color-value-2') as HTMLInputElement | null;
                      if (swatch) swatch.style.backgroundColor = e.target.value;
                      if (text) text.value = e.target.value;
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Verification Document Upload */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="verification-upload"
                className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-white/30 bg-white/8 px-4 py-6 text-white/70 transition hover:bg-white/10"
              >
                {verificationFile ? (
                  <>
                    <RiCheckLine className="text-2xl text-green-400" />
                    <span className="font-source-sans text-sm">{verificationFile.name}</span>
                  </>
                ) : (
                  <>
                    <RiFileUploadLine className="text-2xl" />
                    <span className="font-source-sans text-sm">Upload Verification Document or Receipt</span>
                  </>
                )}
              </label>
              <input
                id="verification-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleVerificationUpload}
              />
            </div>

            {/* Password and Confirm Password - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Password" 
                  className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 pr-12 text-white outline-none transition focus:border-[#5D44F8] font-source-sans" 
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
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
              
              <div className="relative">
                <input 
                  required 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm Password" 
                  className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 pr-12 text-white outline-none transition focus:border-[#5D44F8] font-source-sans" 
                />
                <button
                  type="button"
                  onMouseDown={() => setShowConfirmPassword(true)}
                  onMouseUp={() => setShowConfirmPassword(false)}
                  onMouseLeave={() => setShowConfirmPassword(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors p-1"
                >
                  {showConfirmPassword ? (
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
            </div>

            {error && (
              <div className="mt-4 text-red-500 text-center font-source-sans">
                {error}
              </div>
            )}
          </div>
        </div>
      </form>

        {/* Button Container - Only Continue Button */}
        <div className="flex flex-row items-center justify-center gap-4">
          {/* Continue Button */}
          <button
            type="submit"
            form="registration-form"
            className="inline-flex items-center justify-center px-8 py-0 h-12 rounded-xl text-white text-xl font-semibold cursor-pointer transition-all duration-300 hover:bg-[#4c35d1] hover:shadow-[0_0_40px_rgba(93,68,248,0.4)] transform hover:-translate-y-1 font-montserrat leading-tight"
            style={{
              background: '#5D44F8',
              border: 'none',
              boxShadow: '0 4px 12px rgba(93, 68, 248, 0.3)'
            }}
          >
            Continue →
          </button>
        </div>
      </main>
    </div>
  );
}