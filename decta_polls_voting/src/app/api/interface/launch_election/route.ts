import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { electionId } = await request.json();

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Use Service Role to bypass RLS for orchestration logic
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Election to verify status
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('status')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    if (election.status !== 'PUBLISHED') {
      return NextResponse.json({ error: `Election must be PUBLISHED to launch. Current status: ${election.status}` }, { status: 400 });
    }

    // 2. Find the first enabled phase
    // IMPORTANT: Table name is 'election phase' with a space to match PhaseResolverService
    const { data: phases, error: phaseError } = await supabase
      .from('election phase')
      .select('id, phase_type, phase_index')
      .eq('electionID', electionId)
      .eq('is_enabled', true)
      .order('phase_index', { ascending: true })
      .limit(1);

    if (phaseError || !phases || phases.length === 0) {
      console.error('Launch Error: Phase fetch failed:', phaseError);
      return NextResponse.json({ error: 'No enabled phases found for this election.' }, { status: 400 });
    }

    const firstPhase = phases[0];

    // 3. Perform the Launch Transaction
    const now = new Date().toISOString();

    // Update election status
    const { error: updateError } = await supabase
      .from('election')
      .update({
        status: 'ACTIVE'
      })
      .eq('id', electionId);

    if (updateError) {
      console.error('Launch Error: Election status update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update election status.' }, { status: 500 });
    }

    // Start the first phase
    const { error: phaseUpdateError } = await supabase
      .from('election phase')
      .update({ 
        started_at: now,
        start_date: now
      })
      .eq('id', firstPhase.id);

    if (phaseUpdateError) {
      console.error('Launch Error: Phase start update failed:', phaseUpdateError);
      // Attempt rollback
      await supabase.from('election').update({ status: 'PUBLISHED' }).eq('id', electionId);
      return NextResponse.json({ error: 'Failed to initialize the first phase.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Election launched successfully!',
      activePhase: firstPhase.phase_type
    });

  } catch (err: any) {
    console.error('Launch API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
