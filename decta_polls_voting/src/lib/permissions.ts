/**
 * Shared permission → route map.
 * Used by both middleware.ts (server) and PermissionGuard (client).
 *
 * Each route requires the user to have AT LEAST ONE of the listed permission IDs.
 * A wildcard "*" in the user's permissions array grants access to everything.
 */

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/users/tenant/dashboard": [], // any authenticated tenant user
  "/users/tenant/elections": [
    "election.create", "election.update", "election.view", "election.activate", "election.archive", "election.delete",
    "election.filing.access", "election.filing.insert", "election.filing.delete", "election.filing.update", "election.filing.select",
    "election.screening.access", "election.screening.insert", "election.screening.review", "election.screening.delete", "election.screening.update", "election.screening.approval",
    "election.appeal.access", "election.appeal.config.update", "election.appeal.config.edit", "election.appeal.config.insert", "election.appeal.config.review", "election.appeal.eligibility", "election.appeal.decision", "election.appeal.outcome", "election.appeal.visibility", "election.appeal.withdrawal",
    "election.publication.access", "election.publication.insert", "election.publication.delete", "election.publication.update",
    "election.voting.access", "election.voting.config.update", "election.voting.ballot.update",
    "election.results.access", "election.results.config.update"
  ],
  "/users/tenant/candidates": [
    "candidate.access", "candidate.view", "candidate.review", "candidate.approve", "candidate.reject", "candidate.override",
    "document.view", "document.verify", "document.reject",
    "appeal.access", "appeal.review", "appeal.approve", "appeal.reject"
  ],
  "/users/tenant/voters": ["voter.import", "voter.approve", "voter.reject", "voter.remove", "voter.assign_token"],
  "/users/tenant/settings": [
    "settings.global.view", "settings.global.edit", "settings.global.notifications",
    "settings.account.view", "settings.account.edit", "settings.subscription.manage",
    "settings.roles.view", "settings.roles.assign", "settings.roles.edit", "settings.roles.delete"
  ],
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
