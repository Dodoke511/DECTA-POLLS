import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { electionId, positions } = await request.json();

    if (!electionId || !positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: 'Missing electionId or invalid positions payload.' },
        { status: 400 }
      );
    }

    // Clean existing records to avoid duplicates when rapidly testing format
    const { error: delError } = await supabase
      .from('positions')
      .delete()
      .eq('electionID', electionId);

    if (delError) {
      console.error('API Error: Failed to delete previous positions:', delError);
      return NextResponse.json(
        { error: 'Failed to clear draft positions.' },
        { status: 500 }
      );
    }

    // Construct records payload
    const recordsToInsert = positions.map((pos: any) => ({
      electionID: electionId,
      title: pos.title,
      seats: parseInt(pos.maxWinners, 10) || 1,
    }));

    // If there are positions to insert, proceed
    if (recordsToInsert.length > 0) {
      const { error: insError } = await supabase
        .from('positions')
        .insert(recordsToInsert);

      if (insError) {
        console.error('API Error: Insert positions failed:', insError);
        return NextResponse.json(
          { error: 'Failed to save formulated positions.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Positions saved successfully.' },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('save_positions API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
