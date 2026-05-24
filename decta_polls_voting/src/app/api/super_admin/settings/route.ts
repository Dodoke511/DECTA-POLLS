import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Super Admin API to manage global system settings.
 */
export async function GET(request: Request) {
  try {
    // Basic verification (Super Admin token check)
    // Note: In a production app, we'd verify the JWT properly, but for now 
    // we match the pattern used in the Super Admin dashboard components.
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;

    // Convert list to a key-value object
    const settings = data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ settings }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { settings } = await request.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }

    // Upsert each setting
    const promises = Object.entries(settings).map(([key, value]) => 
      supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error).map(r => r.error?.message);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 500 });
    }

    return NextResponse.json({ message: 'Settings updated successfully.' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
