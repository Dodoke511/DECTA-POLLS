import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId, phases } = await request.json();

    if (!electionId || !phases || !Array.isArray(phases)) {
      return NextResponse.json(
        { error: 'Missing electionId or invalid phases payload.' },
        { status: 400 }
      );
    }

    const records = phases.map((p: any) => {
      const row: any = {
        electionID: electionId,
        phase_type: p.phase_type,
        phase_index: p.phase_index,
        is_enabled: p.is_enabled,
        name: p.name || '',
        deadline: p.deadline || null,
        role_assigned: p.role_assigned || null,
        transition_mode: p.transition_mode || 'manual',
      };
      
      // Crucial: Only include the id key if it actually exists. 
      // Providing { id: undefined } or { id: null } can crash PosegREST if it's a primary key.
      if (p.id) row.id = p.id;
      
      return row;
    });

    const { error } = await supabase
      .from('election phase')
      .upsert(records, { onConflict: 'electionID, phase_type' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pipeline saved successfully.' }, { status: 200 });
  } catch (err: any) {
    console.error('API save error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
