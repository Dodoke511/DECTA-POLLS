"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { PERMISSIONS_COOKIE, canAccessRoute, ROUTE_PERMISSIONS } from "@/lib/permissions";

interface PermissionContextValue {
  permissions: string[];
  isOwner: boolean;
  isLoaded: boolean;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  canAccess: (route: string) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  isOwner: false,
  isLoaded: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  canAccess: () => false,
});

/**
 * Reads the decta_permissions cookie from the browser.
 */
function readPermissionsCookie(): string[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${PERMISSIONS_COOKIE}=`));
  if (!match) return [];
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch {
    return [];
  }
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const perms = readPermissionsCookie();
    setPermissions(perms);
    setIsLoaded(true);
  }, []);

  const isOwner = permissions.includes("*");

  const hasPermission = (permissionId: string): boolean => {
    if (isOwner) return true;
    return permissions.includes(permissionId);
  };

  const hasAnyPermission = (permissionIds: string[]): boolean => {
    if (isOwner) return true;
    return permissionIds.some((id) => permissions.includes(id));
  };

  const canAccess = (route: string): boolean => {
    return canAccessRoute(route, permissions);
  };

  return (
    <PermissionContext.Provider
      value={{ permissions, isOwner, isLoaded, hasPermission, hasAnyPermission, canAccess }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
