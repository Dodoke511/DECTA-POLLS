'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConfirmRemovalContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'idle' | 'loading' | 'confirming' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [orgName, setOrgName] = useState('');
    const [roleName, setRoleName] = useState('');

    // Verify the token is valid on mount (without confirming yet)
    useEffect(() => {
        if (!token) {
            setErrorMsg('Invalid link. No confirmation token found.');
            setStatus('error');
            return;
        }
        // Pre-validate by just checking the token exists — we do a lightweight GET-style check
        // by calling the confirm endpoint only on user click, so here we just show the idle UI
        setStatus('idle');
    }, [token]);

    const handleConfirm = async () => {
        if (!token) return;
        setStatus('confirming');
        try {
            const res = await fetch('/api/confirm_remove_assigned_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'Failed to confirm removal.');
                setStatus('error');
            } else {
                setOrgName(data.organization || '');
                setRoleName(data.roleName || '');
                setStatus('success');
            }
        } catch {
            setErrorMsg('An unexpected error occurred. Please try again.');
            setStatus('error');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6">
                <div className="w-14 h-14 border-4 border-[#5D44F8] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white/50 text-sm animate-pulse">Loading...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl mb-6">⚠️</div>
                <h1 className="text-2xl font-bold mb-2">Confirmation Failed</h1>
                <p className="text-white/50 max-w-md mb-8">{errorMsg}</p>
                <Link href="/" className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium border border-white/10">
                    Return Home
                </Link>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#03070f] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mb-6">✓</div>
                <h1 className="text-3xl font-bold mb-3">Access Removed</h1>
                <p className="text-white/50 max-w-md mb-2">
                    Your <strong className="text-white/70">{roleName}</strong> role within{' '}
                    <strong className="text-white/70">{orgName}</strong> has been successfully removed.
                </p>
                <p className="text-white/30 text-sm max-w-sm mb-10">
                    You no longer have access to the features associated with that role. Contact your administrator if you have any questions.
                </p>
                <Link href="/" className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all font-semibold border border-white/10 text-sm">
                    Return Home
                </Link>
            </div>
        );
    }

    // status === 'idle' — show confirmation screen
    return (
        <div
            className="min-h-screen w-full text-white flex items-center justify-center p-6"
            style={{
                backgroundColor: '#03070f',
                backgroundImage: 'radial-gradient(ellipse at 50% 20%, #2d1570 0%, #180d42 40%, #090215 80%)',
            }}
        >
            <div className="w-full max-w-md">
                <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-10 shadow-[0_0_80px_rgba(93,68,248,0.1)] backdrop-blur-sm text-center">

                    {/* Icon */}
                    <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>

                    {/* Header */}
                    <h1 className="text-2xl font-bold mb-2" style={{ color: '#D0C8FF' }}>
                        Confirm Access Removal
                    </h1>
                    <p className="text-white/40 text-sm leading-relaxed mb-8">
                        An administrator has requested to remove your role assignment. By confirming below, you acknowledge that your access will be permanently revoked.
                    </p>

                    {/* Warning box */}
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 mb-8 text-left">
                        <p className="text-red-400 text-[13px] font-medium mb-1">⚠ This action cannot be undone</p>
                        <p className="text-white/30 text-[12px] leading-relaxed">
                            Clicking confirm will immediately remove your role within the organization on DECTA Polls.
                        </p>
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        disabled={status === 'confirming'}
                        className="w-full py-4 rounded-[16px] bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-[15px] transition-all shadow-[0_8px_24px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                    >
                        {status === 'confirming' ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Confirming...
                            </span>
                        ) : (
                            'Yes, Remove My Access'
                        )}
                    </button>

                    <p className="text-white/20 text-[11px]">
                        If you did not expect this email, ignore it — your access remains unchanged.
                    </p>
                </div>

                <p className="text-center text-white/20 text-xs mt-6">© 2026 DECTA Polls. All rights reserved.</p>
            </div>
        </div>
    );
}

export default function ConfirmRemovalPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#03070f] flex items-center justify-center">
                <div className="w-14 h-14 border-4 border-[#5D44F8] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ConfirmRemovalContent />
        </Suspense>
    );
}
