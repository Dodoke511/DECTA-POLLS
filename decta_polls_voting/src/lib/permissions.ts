/**
 * Shared permission → route map.
 * Used by both middleware.ts (server) and PermissionGuard (client).
 *
 * Each route requires the user to have AT LEAST ONE of the listed permission IDs.
 * A wildcard "*" in the user's permissions array grants access to everything.
 */

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/users/tenant/dashboard": [], // any authenticated tenant user
  "/users/tenant/elections": ["election.create", "election.update", "election.view", "election.activate", "election.archive", "election.delete"],
  "/users/tenant/candidates": ["candidate.view", "candidate.review", "candidate.approve", "candidate.reject", "candidate.override"],
  "/users/tenant/voters": ["voter.import", "voter.approve", "voter.reject", "voter.remove", "voter.assign_token"],
  "/users/tenant/settings": ["tenant.manage", "tenant.settings.update", "role.create", "role.update", "role.delete", "role.assign"],
};

/**
 * Cookie name used to store the user's permissions JSON array.
 */
export const PERMISSIONS_COOKIE = "decta_permissions";

/**
 * Cookie name used to store the user role type.
 */
export const ROLE_COOKIE = "decta_role";

/**
 * Check whether a permissions array grants access to a given route.
 */
export function canAccessRoute(
  pathname: string,
  permissions: string[]
): boolean {
  // Wildcard — tenant owners have full access
  if (permissions.includes("*")) return true;

  // Find the route key that the pathname starts with
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find((key) =>
    pathname.startsWith(key)
  );

  // Unknown route — allow (no restriction configured)
  if (!routeKey) return true;

  const required = ROUTE_PERMISSIONS[routeKey];

  // Route requires no specific permission (just authenticated)
  if (required.length === 0) return true;

  // Check if user has at least one required permission
  return required.some((perm) => permissions.includes(perm));
}
