import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PHASE_PIPELINE, REQUIRED_PHASES } from '@/lib/types/phase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Fetch existing phases
    const { data: existingPhases, error: fetchError } = await supabase
      .from('election phase')
      .select('*')
      .eq('electionID', electionId)
      .order('phase_index', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Seed required defaults if no phases exist yet
    if (!existingPhases || existingPhases.length === 0) {
      const defaults = PHASE_PIPELINE
        .filter(m => REQUIRED_PHASES.includes(m.type))
        .map(m => ({
          electionID: electionId,
          phase_type: m.type,
          phase_index: m.index,
          is_enabled: true,
          name: '',
          transition_mode: 'manual',
          deadline: null,
          role_assigned: null,
          completion_behavior: 'require_all_reviewed',
          auto_resolve_action: 'auto_reject',
        }));

      const { data: seeded, error: seedError } = await supabase
        .from('election phase')
        .insert(defaults)
        .select('*');

      if (seedError) {
        return NextResponse.json({ error: seedError.message }, { status: 500 });
      }

      return NextResponse.json({ phases: seeded ?? [] }, { status: 200 });
    }

    // Also fetch election dates for pre-flight check
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('startDate, endDate, tenantID')
      .eq('id', electionId)
      .single();

    return NextResponse.json({
      phases: existingPhases,
      election: election ?? null,
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
