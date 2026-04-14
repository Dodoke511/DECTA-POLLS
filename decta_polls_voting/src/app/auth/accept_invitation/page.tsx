'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import GradientText from '../../../components/mainlanding/ui/GradientText.jsx';
import { AssignUserModal } from '../../../components/tenant_admin/AssignUserModal';

function AcceptanceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [invitationData, setInvitationData] = useState<any>(null);
    const [tenantData, setTenantData] = useState<any>(null);
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Profile Modal States
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);

    const gradientColors = useMemo(() => ["#5227FF", "#FF9FFC", "#B19EEF"], []);

    useEffect(() => {
        if (!token) {
            setError("Invalid invitation link. Token is missing.");
            setLoading(false);
            return;
        }

        const verifyToken = async () => {
            try {
                const res = await fetch('/api/invitations/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Failed to verify invitation.");
                } else {
                    setInvitationData(data.invitation);
                    setTenantData(data.tenant);
                }
            } catch (err) {
                setError("An error occurred while verifying your invitation.");
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setAccepting(true);
        setError('');

        try {
            const res = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token, 
                    password,
                    ...profileData // Include the verified/corrected info
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to accept invitation.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6">
                <div className="w-16 h-16 border-4 border-[#5D44F8] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white/60 font-light animate-pulse">Verifying your invitation...</p>
            </div>
        );
    }

    if (error && !invitationData) {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl mb-6">⚠️</div>
                <h1 className="text-2xl font-bold mb-2">Invitation Error</h1>
                <p className="text-white/50 max-w-md mb-8">{error}</p>
                <Link href="/" className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium border border-white/10">
                    Return Home
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6 text-center">
                 <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mb-6 animate-bounce">✓</div>
                <h1 className="text-3xl font-bold mb-4">Welcome to the Team!</h1>
                <p className="text-white/60 max-w-md mb-10">
                    Your account has been successfully created. You can now log in to the dashboard using your credentials.
                </p>
                <Link href="/auth/login_form" className="px-10 py-4 bg-[#5D44F8] hover:bg-[#4a35cf] rounded-2xl transition-all shadow-[0_10px_20px_rgba(93,68,248,0.3)] font-semibold">
                    Go to Login
                </Link>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen w-full text-white flex items-center justify-center p-4 md:p-8"
            style={{
                backgroundColor: '#03070f',
                backgroundImage: 'linear-gradient(180deg, #070b24 0%, #03070f 100%)',
            }}
        >
            <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-12">
                
                {/* Left: Branding */}
                <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                    {tenantData?.logo_url ? (
                        <div className="relative w-32 h-32 mb-8 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
                             <Image 
                                src={tenantData.logo_url} 
                                alt={tenantData.organization} 
                                fill 
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-[#5D44F8] rounded-2xl mb-8 flex items-center justify-center text-3xl font-bold shadow-2xl">
                            {tenantData?.organization?.[0] || 'D'}
                        </div>
                    )}
                    
                    <h2 className="text-white/40 uppercase tracking-[0.2em] text-sm font-bold mb-2">Invitation</h2>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
                        Join <span style={{ color: tenantData?.main_color || '#5D44F8' }}>{tenantData?.organization}</span>
                    </h1>
                    <p className="text-white/50 text-lg font-light leading-relaxed max-w-md">
                        Hello {profileData?.first_name || invitationData?.first_name}, you've been invited to join the digital election staff. 
                        Please verify your information and set up your password to finalize your account access.
                    </p>
                </div>

                {/* Right: Form */}
                    <div className="w-full md:w-1/2 max-w-md">
                        {!profileData ? (
                            <div className="glass-card p-8 md:p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h3 className="text-xl font-bold mb-4">Verification Required</h3>
                                <p className="text-white/50 text-sm mb-8">
                                    Before setting up your account, please complete your profile information to verify your identity.
                                </p>
                                <button 
                                    onClick={() => setIsProfileModalOpen(true)}
                                    className="w-full py-4 rounded-xl bg-[#5D44F8] hover:bg-[#4a35cf] text-white font-bold transition-all shadow-xl"
                                >
                                    Complete Profile Verification
                                </button>
                            </div>
                        ) : (
                            <div className="glass-card p-8 md:p-10 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Dynamic background accent based on tenant color */}
                                <div 
                                    className="absolute -top-20 -right-20 w-40 h-40 blur-[100px] opacity-20 rounded-full"
                                    style={{ backgroundColor: tenantData?.main_color || '#5D44F8' }}
                                />

                                <div className="text-center mb-10">
                                    <h3 className="text-2xl font-bold font-montserrat">
                                        <GradientText colors={gradientColors} animationSpeed={8}>
                                            Set Your Password
                                        </GradientText>
                                    </h3>
                                    <p className="text-white/40 text-sm mt-2">{profileData?.email || invitationData?.email}</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleAccept} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[12px] uppercase tracking-widest text-white/40 font-bold ml-1">New Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Min. 8 characters"
                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition-all placeholder:text-white/10"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                                            >
                                                {showPassword ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[12px] uppercase tracking-widest text-white/40 font-bold ml-1">Confirm Password</label>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat your password"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition-all placeholder:text-white/10"
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={accepting || !password || password !== confirmPassword}
                                        className={`w-full py-4 rounded-xl text-lg font-bold transition-all duration-300 shadow-2xl ${
                                            accepting || !password || password !== confirmPassword
                                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                            : 'bg-[#5D44F8] hover:bg-[#4a35cf] text-white hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                        style={(!accepting && password && password === confirmPassword) ? { backgroundColor: tenantData?.main_color } : {}}
                                    >
                                        {accepting ? 'Finalizing...' : 'Complete Account Setup'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setProfileData(null)}
                                        className="w-full text-xs text-white/20 hover:text-white/40 transition-colors mt-2"
                                    >
                                        Edit Profile Information
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

            {/* Profile Verification Modal */}
            <AssignUserModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onAssign={(data) => {
                    setProfileData(data);
                    setIsProfileModalOpen(false);
                }}
                isInvitation={false} // Enables Contact and Birth Date
                title="Profile Verification"
                description="Please verify and complete your identity details."
                submitButtonText="Verify Identity"
                initialData={{
                    email: invitationData?.email,
                    first_name: invitationData?.first_name,
                    middle_name: invitationData?.middle_name,
                    surname: invitationData?.surname,
                }}
            />
        </div>
    );
}

export default function AcceptancePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#03070f] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#5D44F8] border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <AcceptanceContent />
        </Suspense>
    );
}
