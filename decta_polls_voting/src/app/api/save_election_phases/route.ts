import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUsePhase, normalizeSubscription } from '@/lib/subscription-limits';
import type { PhaseType } from '@/lib/types/phase';
import type { TransitionMode } from '@/lib/types/phase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface IncomingPhase {
  id?: string;
  phase_type: PhaseType;
  phase_index: number;
  is_enabled: boolean;
  name?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  role_assigned?: string | null;
  transition_mode?: TransitionMode;
  completion_behavior?: 'require_all_reviewed' | 'auto_resolve_pending';
  auto_resolve_action?: 'auto_reject' | 'auto_approve';
}

interface PhaseRecord extends IncomingPhase {
  electionID: string;
}

export async function POST(request: Request) {
  try {
    const { electionId, phases } = await request.json();

    if (!electionId || !phases || !Array.isArray(phases)) {
      return NextResponse.json(
        { error: 'Missing electionId or invalid phases payload.' },
        { status: 400 }
      );
    }

    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError) {
      return NextResponse.json({ error: electionError.message }, { status: 500 });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('subscription')
      .eq('id', election.tenantID)
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    const subscription = normalizeSubscription(tenant?.subscription);

    const records = (phases as IncomingPhase[]).map((p) => {
      const phaseType = p.phase_type;
      const row: PhaseRecord = {
        electionID: electionId,
        phase_type: phaseType,
        phase_index: p.phase_index,
        is_enabled: canUsePhase(subscription, phaseType) ? p.is_enabled : false,
        name: p.name || '',
        start_date: p.start_date || null,
        deadline: p.deadline || null,
        role_assigned: p.role_assigned || null,
        transition_mode: p.transition_mode || 'manual',
        completion_behavior: p.completion_behavior,
        auto_resolve_action: p.auto_resolve_action,
      };

      // Crucial: Only include the id key if it actually exists. 
      // Providing { id: undefined } or { id: null } can crash PosegREST if it's a primary key.
      if (p.id) row.id = p.id;
      if (row.completion_behavior === undefined) delete row.completion_behavior;
      if (row.auto_resolve_action === undefined) delete row.auto_resolve_action;

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
  } catch (err: unknown) {
    console.error('API save error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
