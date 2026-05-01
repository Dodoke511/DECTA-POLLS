import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { isPhaseActive } from '@/lib/public-election/phase-utils';
import { createClient } from '@supabase/supabase-js';

interface Props {
  onBack: () => void;
  role: 'Voter' | 'Candidate';
}

export function ElectionLoginFlow({ onBack, role }: Props) {
  const { tenant, election, phases } = useElectionPublic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/public/${tenant.slug}/${election.slug}/auth/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.session) {
        // Set cookie for server-side layout detection
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        
        // Also persist in supabase client if available (though redirect will reload state)
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.setSession(data.session);
      }

      // Auto-redirect logic
      if (role === 'Candidate') {
        window.location.href = `/${tenant.slug}/${election.slug}/file`;
        return;
      }

      const isVotingActive = isPhaseActive(phases, 'voting');
      const isPublicationActive = isPhaseActive(phases, 'publication');

      if (isVotingActive) {
        window.location.href = `/${tenant.slug}/${election.slug}/vote`;
      } else if (isPublicationActive) {
        window.location.href = `/${tenant.slug}/${election.slug}/candidates`;
      } else {
        window.location.href = `/${tenant.slug}/${election.slug}`; // reload home
      }

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
        <h2 className="text-xl font-bold text-slate-900 ml-2">{role} Login</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">{error}</div>}
        
        <input 
          required 
          type="email" 
          placeholder="Email Address" 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          required 
          type="password" 
          placeholder="Password" 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />

        <button type="submit" disabled={loading} className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In securely'}
        </button>
      </form>
    </div>
  );
}
