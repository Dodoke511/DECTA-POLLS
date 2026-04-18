import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PhaseResolverService, RuntimePhase } from '@/lib/workflow/PhaseResolverService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Triggered by Vercel Cron or pg_cron, e.g. every 5 minutes
export async function GET(request: Request) {
  try {
    // Optional: Secret token check
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    const now = new Date().toISOString();

    // Find incomplete, deadline-bound phases where deadline has passed
    const { data: expiredPhases, error: fetchError } = await supabase
      .from('election phase')
      .select('*')
      .eq('transition_mode', 'deadline')
      .is('completed_at', null)
      .lt('deadline', now);

    if (fetchError) {
      console.error('Failed to fetch expired phases:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredPhases || expiredPhases.length === 0) {
      return NextResponse.json({ message: 'No expired phases found. System nominal.' }, { status: 200 });
    }

    const resolver = new PhaseResolverService(supabase);
    const results = [];

    for (const phase of expiredPhases as RuntimePhase[]) {
      try {
        const canMove = await resolver.canTransition(phase);
        
        if (canMove) {
          await resolver.transitionToNextPhase(phase.electionID);
          results.push({ phase_id: phase.id, status: 'transitioned_successfully' });
        } else {
          // It's blocked (e.g. strict policy, no auto-resolve).
          // We can't transition. The system waits for manual intervention.
          // Optional: Send alert webhook here.
          results.push({ phase_id: phase.id, status: 'blocked_requires_manual_intervention' });
        }
      } catch (err: any) {
        // If a transition throws, we catch and log so other elections still process
        console.error(`Transition failed for phase ${phase.id}:`, err);
        results.push({ phase_id: phase.id, status: 'error', reason: err.message });
      }
    }

    return NextResponse.json({ processed: results.length, details: results }, { status: 200 });

  } catch (err: any) {
    console.error('Cron Execution Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
