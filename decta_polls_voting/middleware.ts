import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS_COOKIE, ROLE_COOKIE, canAccessRoute } from "./src/lib/permissions";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard tenant user routes
  if (!pathname.startsWith("/users/tenant")) {
    return NextResponse.next();
  }

  // ── Tenant Owner fast-path ──────────────────────────────────────────────
  // Tenant admins (registered owners) always have full access to all routes.
  const roleCookie = request.cookies.get(ROLE_COOKIE);
  if (roleCookie?.value === "tenant_owner") {
    return NextResponse.next();
  }
  // ────────────────────────────────────────────────────────────────────────

  // Read the permissions cookie
  const permissionsCookie = request.cookies.get(PERMISSIONS_COOKIE);

  // No cookie → not logged in → redirect to login
  if (!permissionsCookie) {
    const loginUrl = new URL("/auth/login_form", request.url);
    return NextResponse.redirect(loginUrl);
  }

  let permissions: string[] = [];
  try {
    permissions = JSON.parse(decodeURIComponent(permissionsCookie.value));
  } catch {
    // Malformed cookie — treat as not authenticated
    const loginUrl = new URL("/auth/login_form", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Wildcard — covers tenant owners whose role cookie may have been lost
  if (permissions.includes("*")) {
    return NextResponse.next();
  }

  // Check if the user has access to this route
  if (!canAccessRoute(pathname, permissions)) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/users/tenant/:path*"],
};
