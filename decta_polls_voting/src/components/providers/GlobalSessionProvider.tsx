'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { handleLogout } from '@/lib/authFetch';

interface SessionContextType {
  lastActive: number;
  timeoutMinutes: number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * Global provider to monitor user activity and enforce session timeouts.
 */
export function GlobalSessionProvider({ children }: { children: React.ReactNode }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(60); // Default 1 hour
  const lastActiveRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Fetch the actual timeout setting from the database
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/super_admin/settings');
        if (res.ok) {
          const { settings } = await res.json();
          if (settings?.security?.session_timeout) {
            setTimeoutMinutes(parseInt(settings.security.session_timeout));
          }
        }
      } catch (err) {
        console.warn('[SessionProvider] Failed to fetch timeout settings, using default.');
      }
    };

    fetchSettings();

    // 2. Track activity (mouse, keys, scroll)
    const updateActivity = () => {
      lastActiveRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('click', updateActivity);

    // 3. Monitor for inactivity
    timerRef.current = setInterval(() => {
      const idleTimeMs = Date.now() - lastActiveRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      // Only enforce if the user is actually logged in
      const hasToken = sessionStorage.getItem('supabaseToken') || sessionStorage.getItem('adminToken');
      
      if (hasToken && idleTimeMs > timeoutMs) {
        console.warn(`[SessionProvider] Session timed out after ${timeoutMinutes} minutes of inactivity.`);
        handleLogout();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeoutMinutes]);

  return (
    <SessionContext.Provider value={{ lastActive: lastActiveRef.current, timeoutMinutes }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within GlobalSessionProvider');
  return context;
};
