"use client";

import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { createClient } from '@supabase/supabase-js';

interface Props {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function CandidateRegistrationFlow({ onBack, onSwitchToLogin }: Props) {
  const { tenant, election } = useElectionPublic();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/candidate-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Auto-login after registration
      const loginRes = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const loginData = await loginRes.json();

      if (loginData.session) {
        // Persist the session in the browser so the layout/session-guard can detect it
        await supabase.auth.setSession(loginData.session);
        
        // Set cookie for server-side layout detection
        document.cookie = `sb-access-token=${loginData.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      
      // Redirect to the file page which will now show the Verification Pending screen
      window.location.href = `/${tenant.slug}/${election.slug}/file`;

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 ml-2">Candidate Registration</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">{error}</div>}
        
        <div className="grid grid-cols-3 gap-4">
          <input required placeholder="First Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
          <input placeholder="Middle Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
          <input required placeholder="Last Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Birth</label>
            <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contact Number</label>
            <input required placeholder="e.g. 09123456789" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
        </div>

        <input required type="email" placeholder="Email Address" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <input required type="password" placeholder="Password" minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <input required type="password" placeholder="Confirm Password" minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" value={formData.confirm} onChange={e => setFormData({...formData, confirm: e.target.value})} />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account & Continue'}
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
