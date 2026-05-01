import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

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

    const [configRes, electionRes] = await Promise.all([
      supabase
        .from('election_site_config')
        .select('*')
        .eq('election_id', electionId)
        .maybeSingle(),
      supabase
        .from('election')
        .select('title, description, tenantID, slug, status')
        .eq('id', electionId)
        .single()
    ]);

    if (configRes.error) {
      return NextResponse.json({ error: configRes.error.message }, { status: 500 });
    }

    if (electionRes.error) {
      return NextResponse.json({ error: electionRes.error.message }, { status: 500 });
    }

    // Fetch tenant branding, subscription, and slug
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('subscription, main_color, secondary_color, third_color, logo_url, slug')
      .eq('id', electionRes.data.tenantID)
      .single();

    return NextResponse.json({
      config: configRes.data,
      election: electionRes.data,
      subscription: tenantData?.subscription || 'BASIC',
      tenantSlug: tenantData?.slug,
      tenantBranding: {
        main_color: tenantData?.main_color,
        secondary_color: tenantData?.secondary_color,
        third_color: tenantData?.third_color,
        logo_url: tenantData?.logo_url
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
