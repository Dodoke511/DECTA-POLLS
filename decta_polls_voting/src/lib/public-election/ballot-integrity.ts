"use client";

import { useEffect, useState, useCallback } from 'react';

export interface IntegrityStatus {
  tabBlurCount: number;
  visibilityHiddenCount: number;
  totalWarnings: number;
  isFlagged: boolean;
}

/**
 * Hook to monitor ballot integrity by detecting tab switching and window blurring.
 * This triggers API calls to the server to record these events securely.
 */
export function useBallotIntegrity(tenantSlug: string, electionSlug: string, sessionId: string | null) {
  const [status, setStatus] = useState<IntegrityStatus>({
    tabBlurCount: 0,
    visibilityHiddenCount: 0,
    totalWarnings: 0,
    isFlagged: false
  });

  const reportEvent = useCallback(async (eventType: 'tab_blur' | 'visibility_hidden') => {
    if (!sessionId) return;
    
    try {
      const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/vote/session/integrity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, eventType })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setStatus({
            tabBlurCount: data.status.tab_blur_count,
            visibilityHiddenCount: data.status.visibility_blur_count,
            totalWarnings: data.status.integrity_warnings,
            isFlagged: data.status.status === 'flagged'
          });
        }
      }
    } catch (err) {
      console.error('Failed to report integrity event', err);
    }
  }, [tenantSlug, electionSlug, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus(s => ({ ...s, visibilityHiddenCount: s.visibilityHiddenCount + 1, totalWarnings: s.totalWarnings + 1 }));
        reportEvent('visibility_hidden');
      }
    };

    const handleBlur = () => {
      setStatus(s => ({ ...s, tabBlurCount: s.tabBlurCount + 1, totalWarnings: s.totalWarnings + 1 }));
      reportEvent('tab_blur');
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your ballot is not submitted yet and you will lose your progress.";
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, reportEvent]);

  return status;
}
