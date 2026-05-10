import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { appealId, decision } = await request.json();

    if (!appealId || !decision) {
      return NextResponse.json({ error: 'Missing appealId or decision' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get appeal info
    const { data: appeal, error: fetchError } = await supabase
      .from('appeals')
      .select('candidateID, electionID')
      .eq('id', appealId)
      .single();

    if (fetchError || !appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    // 2. Update appeal status
    const status = decision === 'approved' ? 'approved' : 'rejected';
    const { error: updateError } = await supabase
      .from('appeals')
      .update({ status })
      .eq('id', appealId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. If approved, restore candidate status
    if (decision === 'approved') {
      await supabase
        .from('candidate')
        .update({ status: 'APPROVED' }) // Fallback to APPROVED, ideally read from appeal config
        .eq('id', appeal.candidateID);
    }

    // 4. Log decision (optional, if we have a table)
    // For now we just return success

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
