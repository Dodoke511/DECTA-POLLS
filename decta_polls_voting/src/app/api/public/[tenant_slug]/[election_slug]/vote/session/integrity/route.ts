import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;
    const body = await request.json();
    const { sessionId, eventType } = body;

    if (!sessionId || !eventType) {
      return NextResponse.json({ error: 'Missing sessionId or eventType' }, { status: 400 });
    }

    if (!['tab_blur', 'visibility_hidden'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Call the RPC to log the event
    const { error: rpcError } = await supabaseAdmin.rpc('log_ballot_integrity_event', {
      p_session_id: sessionId,
      p_event_type: eventType
    });

    if (rpcError) {
      console.error('Failed to log integrity event:', rpcError);
      return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
    }

    // Fetch the updated status to return to client
    const { data: status } = await supabaseAdmin
      .from('ballot_sessions')
      .select('tab_blur_count, visibility_blur_count, integrity_warnings, status')
      .eq('id', sessionId)
      .single();

    return NextResponse.json({ success: true, status });

  } catch (error) {
    console.error('Integrity logging error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
