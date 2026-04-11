"use client";

import React from "react";
import { usePermissions } from "@/components/providers/PermissionProvider";

interface PermissionGuardProps {
  /** At least one of these permission IDs must be held by the user */
  require: string[];
  /** Content to render when access is granted */
  children: React.ReactNode;
  /** Optional: custom message shown when access is denied */
  deniedMessage?: string;
  /** Optional: if true, renders nothing instead of the denied panel */
  silent?: boolean;
}

/**
 * Wraps any content that should only be visible to users with the required permissions.
 *
 * Usage:
 * <PermissionGuard require={['voter.approve', 'voter.import']}>
 *   <VoterTable />
 * </PermissionGuard>
 */
export function PermissionGuard({
  require,
  children,
  deniedMessage = "You don't have permission to access this section.",
  silent = false,
}: PermissionGuardProps) {
  const { hasAnyPermission, isLoaded } = usePermissions();

  // Don't flash the denied state while loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm animate-pulse">
        Checking access...
      </div>
    );
  }

  if (!hasAnyPermission(require)) {
    if (silent) return null;
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-5">
          🔒
        </div>
        <h3 className="text-lg font-bold text-white/80 mb-2">Access Restricted</h3>
        <p className="text-[13px] text-white/40 max-w-xs">{deniedMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
