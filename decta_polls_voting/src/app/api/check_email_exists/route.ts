export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json();
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('tenant users')
      .select('id, tenantID, user_type')
      .eq('email', email);

    if (error) {
      console.error('[check_email] DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const rows = data || [];
    const exists = rows.length > 0;
    const roles = rows.map((r: any) => ((r.user_type || '') as string).toLowerCase());
    const existsAdmin = roles.includes('admin');
    const existsNonAdmin = roles.some((role: string) => role && role !== 'admin');

    return NextResponse.json({ exists, existsAdmin, existsNonAdmin, roles, matches: rows });
  } catch (err: any) {
    console.error('[check_email] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
