import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electionId, config } = body;

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Resolve tenantID from election
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    const configRecord = {
      ...config,
      election_id: electionId,
      tenant_id: election.tenantID,
      updated_at: new Date().toISOString(),
    };

    // Remove id from config to let upsert handle it or use existing
    delete configRecord.id;

    const { data, error } = await supabase
      .from('results_config')
      .upsert(configRecord, { onConflict: 'election_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('save_results_config error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
