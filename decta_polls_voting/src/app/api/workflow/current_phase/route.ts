import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PhaseResolverService } from '@/lib/workflow/PhaseResolverService';

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

    const resolver = new PhaseResolverService(supabase);
    const currentPhase = await resolver.getCurrentActivePhase(electionId);

    if (!currentPhase) {
      return NextResponse.json({ 
        message: 'No active phase found. Election might be unstarted or fully completed.',
        phase: null
      }, { status: 200 });
    }

    return NextResponse.json({
      phase_id: currentPhase.id,
      phase_type: currentPhase.phase_type,
      phase_index: currentPhase.phase_index,
      deadline: currentPhase.deadline || null,
      started_at: currentPhase.started_at || null,
      status: (currentPhase as any).status
    }, { status: 200 });

  } catch (err: any) {
    console.error('Current Phase Retrieval Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
