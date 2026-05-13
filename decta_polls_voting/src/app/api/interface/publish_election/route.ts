import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUseInterfaceBuilder, normalizeSubscription } from '@/lib/subscription-limits';

export async function POST(request: Request) {
  try {
    const { electionId } = await request.json();

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Get the User's JWT from the Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch all necessary data for validation
    const [electionRes, configRes, phasesRes, positionsRes] = await Promise.all([
      supabase.from('election').select('*').eq('id', electionId).single(),
      supabase.from('election_site_config').select('*').eq('election_id', electionId).maybeSingle(),
      supabase.from('election phase').select('*').eq('electionID', electionId),
      supabase.from('positions').select('id', { count: 'exact' }).eq('electionID', electionId)
    ]);

    if (electionRes.error || phasesRes.error) {
      return NextResponse.json({ error: 'Failed to fetch election data for validation.' }, { status: 500 });
    }

    const election = electionRes.data;
    const config = configRes.data;
    const phases = phasesRes.data || [];
    const positionsCount = positionsRes.count || 0;
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('subscription')
      .eq('id', election.tenantID)
      .single();

    if (tenantError) {
      return NextResponse.json({ error: 'Failed to fetch tenant subscription for validation.' }, { status: 500 });
    }

    const subscription = normalizeSubscription(tenant?.subscription);
    const requiresInterfaceConfig = canUseInterfaceBuilder(subscription);

    // 2. Pre-flight Validation Logic (Server-side)
    const errors: string[] = [];

    // Check Positions
    if (positionsCount === 0) {
      errors.push('At least one electoral position must be defined.');
    }

    // Check Site Config. Basic uses the predefined public website, so it does not
    // require Interface tab configuration.
    if (requiresInterfaceConfig) {
      if (!config) {
        errors.push('Public election site configuration is missing.');
      } else if (!config.public_title) {
        errors.push('Public site title has not been set in the Interface tab.');
      }
    }

    // Check Phases
    const filing = phases.find(p => p.phase_type === 'filing');
    const voting = phases.find(p => p.phase_type === 'voting');
    const results = phases.find(p => p.phase_type === 'results');
    const screening = phases.find(p => p.phase_type === 'screening');
    const appeal = phases.find(p => p.phase_type === 'appeal');

    if (!filing) errors.push('Filing phase is missing.');
    if (!voting) errors.push('Voting phase is missing.');
    if (!results) errors.push('Results phase is missing.');
    if (filing?.transition_mode === 'deadline' && !filing.deadline) errors.push('Filing phase deadline is not configured.');
    if (voting?.transition_mode === 'deadline' && (!voting.start_date || !voting.deadline)) errors.push('Voting period (start & end) is not configured.');
    if (results?.transition_mode === 'deadline' && (!results.start_date || !results.deadline)) errors.push('Results period (start & end) is not configured.');

    if (screening?.is_enabled && !screening.role_assigned) {
      errors.push('Screening phase is enabled but has no manager role assigned.');
    }

    if (appeal?.is_enabled && !screening?.is_enabled) {
      errors.push('Appeal phase cannot be enabled if Screening is disabled.');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Pre-flight check failed.',
        details: errors
      }, { status: 400 });
    }

    // 3. Update Status to PUBLISHED
    const { error: updateError } = await supabase
      .from('election')
      .update({ status: 'PUBLISHED' })
      .eq('id', electionId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update election status.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Election published successfully!'
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
