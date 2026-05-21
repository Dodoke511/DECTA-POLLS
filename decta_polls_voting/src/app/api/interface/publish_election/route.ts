import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUseInterfaceBuilder, normalizeSubscription } from '@/lib/subscription-limits';
import { PHASE_PIPELINE } from '@/lib/types/phase';

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
    let config = configRes.data;
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
      if (!config || !config.public_title) {
        try {
          const defaultTitle = election.title || 'Untitled Election';
          const defaultWelcome = election.description || '';

          const { data: newConfig, error: upsertError } = await supabase
            .from('election_site_config')
            .upsert({
              election_id: electionId,
              tenant_id: election.tenantID,
              public_title: config?.public_title || defaultTitle,
              welcome_message: config?.welcome_message || defaultWelcome,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'election_id'
            })
            .select()
            .single();

          if (upsertError) {
            console.error('[publish_election] Failed to auto-initialize site config:', upsertError);
            errors.push('Public election site configuration is missing or incomplete, and auto-initialization failed.');
          } else {
            config = newConfig;
          }
        } catch (err) {
          console.error('[publish_election] Exception during auto-initialization:', err);
          errors.push('Public election site configuration is missing or incomplete, and auto-initialization failed.');
        }
      }
    }

    // Check Phases using dynamic pipeline metadata matching the client-side isStepComplete
    for (const meta of PHASE_PIPELINE) {
      const phase = phases.find(p => p.phase_type === meta.type);

      // If a required phase is missing entirely
      if (meta.required && !phase) {
        errors.push(`${meta.defaultName} phase is missing.`);
        continue;
      }

      // If phase exists but is disabled (and is not required)
      if (phase && !phase.is_enabled && !meta.required) {
        continue;
      }

      if (phase) {
        const displayName = phase.name?.trim() || meta.defaultName;

        // 1. Name validation
        if (!phase.name || phase.name.trim() === '') {
          errors.push(`${displayName} phase name is required.`);
        }

        // 2. Transition Mode / Dates validation
        const isDeadlineMode = phase.transition_mode === 'deadline';
        if (isDeadlineMode) {
          if (meta.hasDeadline && !meta.hasStartDate && !phase.deadline) {
            errors.push(`${displayName} phase deadline is not configured.`);
          }
          if (meta.hasStartDate && (!phase.start_date || !phase.deadline)) {
            errors.push(`${displayName} phase start date and deadline are not configured.`);
          }
        }

        // 3. Role validation
        // A role is required if:
        // - transition_mode is manual (to advance the phase)
        // - OR the phase has completion behaviors (screening, appeal) even in deadline mode
        const requiresRole = phase.transition_mode === 'manual' || meta.hasCompletionBehavior;
        if (meta.hasManagerRole && requiresRole && !phase.role_assigned) {
          errors.push(`${displayName} phase has no manager role assigned.`);
        }

        // 4. Phase-specific dependencies
        if (meta.type === 'appeal') {
          const screeningEnabled = phases.find(p => p.phase_type === 'screening')?.is_enabled;
          if (!screeningEnabled) {
            errors.push('Appeal phase cannot be enabled if Screening is disabled.');
          }
        }
      }
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
