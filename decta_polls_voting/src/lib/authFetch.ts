/**
 * Centralized fetch utility for management APIs.
 * Automatically injects the Supabase JWT and handles session expiration.
 */

export async function authFetch(url: string, options: RequestInit = {}) {
  // 1. Get token from sessionStorage
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('supabaseToken') : null;

  // 2. Prepare headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // 3. Execute fetch
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 4. Handle common auth errors
    if (response.status === 401) {
      console.error('Session expired or unauthorized. Redirecting to login.');
      handleLogout();
      throw new Error('UNAUTHORIZED');
    }

    return response;
  } catch (error) {
    console.error('authFetch error:', error);
    throw error;
  }
}

/**
 * Handles clearing session data and redirecting to login.
 */
export function handleLogout() {
  if (typeof window === 'undefined') return;

  // Clear all relevant session data
  sessionStorage.removeItem('supabaseToken');
  sessionStorage.removeItem('tenantToken');
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('tenantUserId');
  sessionStorage.removeItem('tenantEmail');
  sessionStorage.removeItem('tenantStatus');

  // Clear cookies used by middleware
  document.cookie = 'decta_permissions=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'decta_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'decta_user_type=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

  // Redirect to login
  window.location.href = '/auth/login_form';
}
