import { createClient } from '@supabase/supabase-js';

/**
 * Checks if a tenant is allowed to add more users based on their user_limit.
 * @param tenantId The UUID of the tenant
 * @returns An object containing whether it's allowed, the current count, and the limit.
 */
export async function checkUserLimit(tenantId: string): Promise<{ 
  allowed: boolean; 
  currentCount: number; 
  limit: number | null; 
  error?: string 
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get the tenant's user_limit
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('user_limit')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return { allowed: false, currentCount: 0, limit: null, error: 'Tenant not found' };
    }

    const limit = tenant.user_limit;

    // If limit is null, it means unlimited
    if (limit === null) {
      return { allowed: true, currentCount: 0, limit: null }; 
    }

    // 2. Get the current user count for this tenant
    // Using count: 'exact' with head: true is the most efficient way to get a count in Supabase
    const { count, error: countError } = await supabase
      .from('tenant users')
      .select('*', { count: 'exact', head: true })
      .eq('tenantID', tenantId);

    if (countError) {
      return { allowed: false, currentCount: 0, limit, error: 'Failed to fetch user count' };
    }

    const currentCount = count || 0;

    return { 
      allowed: currentCount < limit, 
      currentCount, 
      limit 
    };

  } catch (error: any) {
    return { allowed: false, currentCount: 0, limit: null, error: error.message || 'Internal server error' };
  }
}
