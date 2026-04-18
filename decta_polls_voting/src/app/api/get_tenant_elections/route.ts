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

    // Attempt to fetch latest POSTED election
    const { data: postedElections, error: postedError } = await supabase
      .from('election')
      .select('id, title, status, banner, created_at')
      .eq('tenantID', tenantId)
      .eq('status', 'POSTED')
      .order('created_at', { ascending: false })
      .limit(1);

    if (postedError) {
      console.error('API Error: Failed fetching POSTED elections:', postedError);
      return NextResponse.json({ error: 'Database fetch error: ' + postedError.message }, { status: 500 });
    }

    // If POSTED exists, return it
    if (postedElections && postedElections.length > 0) {
      return NextResponse.json({ featured: postedElections[0] }, { status: 200 });
    }

    // Fallback: Fetch latest DRAFT election
    const { data: draftElections, error: draftError } = await supabase
      .from('election')
      .select('id, title, status, banner, created_at')
      .eq('tenantID', tenantId)
      .eq('status', 'DRAFT')
      .order('created_at', { ascending: false })
      .limit(1);

    if (draftError) {
      console.error('API Error: Failed fetching DRAFT elections:', draftError);
      return NextResponse.json({ error: 'Database fetch error' }, { status: 500 });
    }

    if (draftElections && draftElections.length > 0) {
      return NextResponse.json({ featured: draftElections[0] }, { status: 200 });
    }

    // If nothing found
    return NextResponse.json({ featured: null }, { status: 200 });
    
  } catch (err: any) {
    console.error('get_tenant_elections API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
