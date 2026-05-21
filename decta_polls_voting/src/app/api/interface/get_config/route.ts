import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BASIC_PUBLIC_SITE_COLORS, normalizeSubscription } from '@/lib/subscription-limits';

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
      console.error("GET CONFIG - configRes error:", configRes.error);
      const isAuthError = configRes.error.message?.includes('JWT') || configRes.error.code === 'PGRST303';
      return NextResponse.json({ error: configRes.error.message }, { status: isAuthError ? 401 : 500 });
    }

    if (electionRes.error) {
      console.error("GET CONFIG - electionRes error:", electionRes.error);
      const isAuthError = electionRes.error.message?.includes('JWT') || electionRes.error.code === 'PGRST303';
      return NextResponse.json({ error: electionRes.error.message }, { status: isAuthError ? 401 : 500 });
    }

    let configData = configRes.data;

    // Check if configuration needs initialization (missing config or missing public_title)
    if (!configData || !configData.public_title) {
      try {
        const { data: upsertedData, error: upsertError } = await supabase
          .from('election_site_config')
          .upsert({
            election_id: electionId,
            tenant_id: electionRes.data.tenantID,
            public_title: configData?.public_title || electionRes.data.title,
            welcome_message: configData?.welcome_message || electionRes.data.description || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'election_id'
          })
          .select()
          .single();

        if (upsertError) {
          console.error('[get_config] Failed to auto-initialize site config in DB:', upsertError);
          configData = {
            ...(configData || {}),
            election_id: electionId,
            tenant_id: electionRes.data.tenantID,
            public_title: configData?.public_title || electionRes.data.title,
            welcome_message: configData?.welcome_message || electionRes.data.description || null,
          };
        } else {
          configData = upsertedData;
        }
      } catch (err) {
        console.error('[get_config] Exception during auto-initialization:', err);
        configData = {
          ...(configData || {}),
          election_id: electionId,
          tenant_id: electionRes.data.tenantID,
          public_title: configData?.public_title || electionRes.data.title,
          welcome_message: configData?.welcome_message || electionRes.data.description || null,
        };
      }
    }

    // Fetch tenant branding, subscription, and slug
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('subscription, main_color, secondary_color, third_color, logo_url, slug')
      .eq('id', electionRes.data.tenantID)
      .single();

    const subscription = normalizeSubscription(tenantData?.subscription);
    const basicConfig = subscription === 'BASIC'
      ? {
        ...(configData || {}),
        override_color: BASIC_PUBLIC_SITE_COLORS.primary,
        secondary_override_color: BASIC_PUBLIC_SITE_COLORS.secondary,
        third_override_color: BASIC_PUBLIC_SITE_COLORS.third,
      }
      : configData;

    return NextResponse.json({
      config: basicConfig,
      election: electionRes.data,
      subscription,
      tenantSlug: tenantData?.slug,
      tenantBranding: {
        main_color: subscription === 'BASIC' ? BASIC_PUBLIC_SITE_COLORS.primary : tenantData?.main_color,
        secondary_color: subscription === 'BASIC' ? BASIC_PUBLIC_SITE_COLORS.secondary : tenantData?.secondary_color,
        third_color: subscription === 'BASIC' ? BASIC_PUBLIC_SITE_COLORS.third : tenantData?.third_color,
        logo_url: tenantData?.logo_url
      }
    });
  } catch (err: unknown) {
    console.error("GET CONFIG - exception:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
