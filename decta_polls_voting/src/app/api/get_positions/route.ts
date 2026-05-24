import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Missing electionId.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('electionID', electionId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('API Error: Failed to fetch positions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch positions.' },
        { status: 500 }
      );
    }

    // Format the database rows back into react-hook-form format
    const positions = data && data.length > 0 
      ? data.map(record => ({ 
          title: record.title, 
          maxWinners: record.seats 
        }))
      : [{ title: "", maxWinners: 1 }]; // Fallback default if empty

    return NextResponse.json(
      { positions },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('get_positions API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
