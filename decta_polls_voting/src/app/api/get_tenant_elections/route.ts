import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      );
    }

    // Fetch all elections for the tenant
    const [{ data: elections, error: fetchError }, { data: tenant, error: tenantError }] = await Promise.all([
      supabase
        .from('election')
        .select('id, title, status, banner, slug, created_at')
        .eq('tenantID', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .single()
    ]);

    if (fetchError || tenantError) {
      console.error('API Error:', fetchError || tenantError);
      return NextResponse.json({ error: 'Database fetch error' }, { status: 500 });
    }

    return NextResponse.json({ 
      elections: elections ?? [],
      tenantSlug: tenant?.slug 
    }, { status: 200 });
    
  } catch (err: any) {
    console.error('get_tenant_elections API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
