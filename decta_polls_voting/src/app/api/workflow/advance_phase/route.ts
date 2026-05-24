import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PhaseResolverService } from '@/lib/workflow/PhaseResolverService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId } = await request.json();

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    const resolver = new PhaseResolverService(supabase);
    await resolver.transitionToNextPhase(electionId, true);

    return NextResponse.json({ message: 'Phase successfully advanced.' }, { status: 200 });

  } catch (err: any) {
    console.error('Phase Transition Error:', err);
    
    if (err.message.includes('BLOCKED:')) {
      return NextResponse.json({ error: err.message }, { status: 409 }); // 409 Conflict for workflow blocks
    }

    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
