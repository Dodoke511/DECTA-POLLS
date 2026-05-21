import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useElectionPublic } from '@/contexts/ElectionPublicContext';
import { Session, createClient } from '@supabase/supabase-js';

interface Props {
  onBack: () => void;
  role: 'Voter' | 'Candidate';
}

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  minLength?: number;
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisible,
  minLength,
}: PasswordFieldProps) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        required
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 pr-12 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <Icon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ElectionLoginFlow({ onBack, role }: Props) {
  const { tenant, election } = useElectionPublic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [returningVoterMode, setReturningVoterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Something went wrong';

  const persistSession = async (session: Session) => {
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.setSession(session);
  };

  const getSupabaseClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const redirectAfterLogin = () => {
    window.location.href = `/${tenant.slug}/${election.slug}/dashboard`;
  };

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

      if (data.requiresPasswordChange) {
        setPendingSession(data.session);
        setRequiresPasswordChange(true);
        setReturningVoterMode(false);
        setPassword('');
        return;
      }

      if (data.session) {
        await persistSession(data.session);
      }

      redirectAfterLogin();

    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!pendingSession?.access_token) {
        throw new Error('Your temporary login session expired. Please log in again.');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match.');
      }

      if (newPassword === '12345') {
        throw new Error('Choose a new password different from the temporary password.');
      }

      const supabase = getSupabaseClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: pendingSession.access_token,
        refresh_token: pendingSession.refresh_token,
      });

      if (sessionError) throw sessionError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          temporary_password: false,
          password_changed_for_election: election.id,
        },
      });

      if (updateError) throw updateError;

      await supabase.auth.signOut();

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      });

      if (loginError) throw loginError;
      if (!loginData.session) throw new Error('Password changed, but login session was not created.');

      await persistSession(loginData.session);
      redirectAfterLogin();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
        <h2 className="text-xl font-bold text-slate-900 ml-2">
          {role === 'Voter' && returningVoterMode ? 'Voter Sign In' : `${role} Login`}
        </h2>
      </div>

      <form onSubmit={requiresPasswordChange ? handlePasswordChange : handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">{error}</div>}

        {role === 'Voter' && !requiresPasswordChange && !returningVoterMode && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
            Enter temporary password 12345 and change it once entered.
          </div>
        )}

        {role === 'Voter' && !requiresPasswordChange && returningVoterMode && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium">
            Use the password you created after changing the temporary password.
          </div>
        )}

        {requiresPasswordChange && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
            You cannot proceed to vote until you change the temporary password 12345.
          </div>
        )}

        {!requiresPasswordChange ? (
          <>
            <input
              required
              type="email"
              placeholder="Email Address"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[var(--tenant-primary)] focus:ring-1 focus:ring-[var(--tenant-primary)] outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <PasswordField
              placeholder={role === 'Voter' && !returningVoterMode ? 'Temporary Password' : 'Password'}
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword(value => !value)}
            />
          </>
        ) : (
          <>
            <PasswordField
              placeholder="New Password"
              minLength={6}
              value={newPassword}
              onChange={setNewPassword}
              visible={showNewPassword}
              onToggleVisible={() => setShowNewPassword(value => !value)}
            />
            <PasswordField
              placeholder="Confirm New Password"
              minLength={6}
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword(value => !value)}
            />
          </>
        )}

        <button type="submit" disabled={loading} className="w-full bg-[var(--tenant-primary)] hover:opacity-90 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-md hover:shadow-lg flex justify-center items-center">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : requiresPasswordChange ? 'Change Password and Continue' : 'Log In securely'}
        </button>

        {role === 'Voter' && !requiresPasswordChange && (
          <div className="pt-1 text-center text-sm text-slate-500">
            {returningVoterMode ? (
              <>
                First time logging in? Use your temporary password{' '}
                <button
                  type="button"
                  onClick={() => {
                    setReturningVoterMode(false);
                    setPassword('');
                    setError('');
                  }}
                  className="font-bold text-[var(--tenant-primary)] underline-offset-4 hover:underline"
                >
                  Enter 12345
                </button>
              </>
            ) : (
              <>
                Coming back as voter?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setReturningVoterMode(true);
                    setPassword('');
                    setError('');
                  }}
                  className="font-bold text-[var(--tenant-primary)] underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
