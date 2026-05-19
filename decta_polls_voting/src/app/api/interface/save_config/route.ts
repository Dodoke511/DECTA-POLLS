import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUseInterfaceBuilder, normalizeSubscription } from '@/lib/subscription-limits';

export async function POST(request: Request) {
  try {
    const { electionId, updates, tenantUserId } = await request.json();

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Get the User's JWT from the Authorization header to respect RLS
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No access token provided.' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // To perform an upsert, we need the tenantId if it's a new record.
    // We'll fetch it once.
    let tenantId;
    if (tenantUserId) {
      const { data: tenantUser } = await supabase
        .from('tenant users')
        .select('tenantID')
        .eq('id', tenantUserId)
        .single();
      tenantId = tenantUser?.tenantID;
    }

    if (!tenantId) {
      // Fallback: get from election table
      const { data: election } = await supabase
        .from('election')
        .select('tenantID')
        .eq('id', electionId)
        .single();
      tenantId = election?.tenantID;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenantId.' }, { status: 400 });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('subscription')
      .eq('id', tenantId)
      .single();

    if (!canUseInterfaceBuilder(normalizeSubscription(tenant?.subscription))) {
      return NextResponse.json(
        { error: 'Interface customization is not available for Basic accounts.' },
        { status: 403 }
      );
    }

    // Use upsert to handle race conditions (multiple rapid saves)
    // We target 'election_id' for the conflict resolution
    const { data, error } = await supabase
      .from('election_site_config')
      .upsert({
        election_id: electionId,
        tenant_id: tenantId,
        ...updates,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'election_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error('Save config error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
