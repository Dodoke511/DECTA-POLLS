import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface ElectionUserContext {
  userId: string;
  name: string;
  isCandidate: boolean;
  isVoter: boolean;
  userType: 'Candidate' | 'Voter';
}

export async function getElectionUserContext(
  supabase: SupabaseClient,
  tenantId: string,
  electionId: string
): Promise<ElectionUserContext | null> {
  // Check for session in cookies (Next.js Server Side)
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;

  let user = null;
  let authError = null;

  if (token) {
    console.log(`[Session Debug] Found sb-access-token, verifying JWT directly...`);
    const { data, error } = await supabase.auth.getUser(token);
    user = data.user;
    authError = error;
  } else {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    authError = error;
  }

  if (authError || !user) {
    console.log(`[Session Debug] Auth user not found: ${authError?.message || 'No user'}`);
    return null;
  }

  if (user.user_metadata?.temporary_password === true) {
    console.log(`[Session Debug] User still has a temporary password. Blocking public election session.`);
    return null;
  }

  // Use Service Role to bypass RLS for profile lookup on server
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`[Session Debug] User authenticated: ${user.id}. Querying tenant users via Admin.`);

  // Query tenant_users with tenant isolation check
  const { data: tenantUser, error } = await supabaseAdmin
    .from('tenant users')
    .select('id, first_name, surname, user_type')
    .eq('id', user.id)
    .eq('tenantID', tenantId)
    .single();

  if (error || !tenantUser) {
    console.error(`[Session Debug] Tenant User query failed or not found:`, error?.message);
    return null; // User doesn't belong to this tenant or doesn't exist
  }

  console.log(`[Session Debug] Successfully resolved user: ${tenantUser.first_name} (${tenantUser.user_type})`);

  const userType = tenantUser.user_type?.toLowerCase() === 'candidate' ? 'Candidate' : 'Voter';
  const isCandidate = userType === 'Candidate';
  const isVoter = userType === 'Voter';

  return {
    userId: tenantUser.id,
    name: `${tenantUser.first_name || ''} ${tenantUser.surname || ''}`.trim() || user.email || 'User',
    isCandidate,
    isVoter,
    userType,
  };
}
