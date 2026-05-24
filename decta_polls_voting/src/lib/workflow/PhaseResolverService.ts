import { SupabaseClient } from '@supabase/supabase-js';
import { PhaseConfig } from '../types/phase';

export type PhaseStatus = 'upcoming' | 'active' | 'completed' | 'for_transition';

export interface RuntimePhase extends PhaseConfig {
  start_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export class PhaseResolverService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 1. Dynamic Phase Status Resolver
   */
  resolvePhaseStatus(phase: RuntimePhase, now: Date = new Date()): PhaseStatus {
    if (phase.completed_at) {
      return 'completed';
    }

    if (phase.transition_mode === 'deadline') {
      const startDate = phase.start_date ? new Date(phase.start_date) : null;
      const deadline = phase.deadline ? new Date(phase.deadline) : null;

      if (startDate && now < startDate) {
        return 'upcoming';
      }
      
      if (deadline && now > deadline) {
        return 'for_transition';
      }

      // If past start_date (or no start_date) and before deadline (or no deadline)
      if (startDate && startDate <= now && (!deadline || now <= deadline)) {
         return 'active';
      }
      if (!startDate && deadline && now <= deadline) {
         return 'active'; // active if it has a deadline but no start date constraint
      }

      return 'upcoming';
    }

    if (phase.transition_mode === 'manual') {
      if (!phase.started_at) {
        return 'upcoming';
      }
      if (phase.started_at && !phase.completed_at) {
        return 'active';
      }
    }

    return 'upcoming'; // fail-safe
  }

  /**
   * 2. Get Current Active Phase
   */
  async getCurrentActivePhase(electionId: string): Promise<RuntimePhase | null> {
    const { data, error } = await this.supabase
      .from('election phase')
      .select('*')
      .eq('electionID', electionId)
      .eq('is_enabled', true)
      .order('phase_index', { ascending: true });

    if (error || !data) return null;

    const now = new Date();
    for (const p of data as RuntimePhase[]) {
      const status = this.resolvePhaseStatus(p, now);
      if (status === 'active' || status === 'for_transition') {
        // We inject the runtime derived status back in for convenience
        return { ...p, status } as any; 
      }
    }

    return null;
  }

  /**
   * 3. Transition Validator
   */
  async canTransition(phase: RuntimePhase): Promise<boolean> {
    const isScreening = phase.phase_type === 'screening';
    const isAppeal = phase.phase_type === 'appeal';

    if (!isScreening && !isAppeal) {
      return true; // Simple phases without pending logic pass instantly
    }

    let pendingCount = 0;

    if (isScreening) {
      const { count } = await this.supabase
        .from('candidate')
        .select('*', { count: 'exact', head: true })
        .eq('electionID', phase.electionID)
        .eq('status', 'pending');
      pendingCount = count || 0;
    }

    if (isAppeal) {
      const { count } = await this.supabase
        .from('appeals')
        .select('*', { count: 'exact', head: true })
        .eq('electionID', phase.electionID)
        .eq('status', 'pending'); // Assuming 'pending' exists for appeals
      pendingCount = count || 0;
    }

    if (pendingCount === 0) {
      return true;
    }

    if (phase.completion_behavior === 'require_all_reviewed') {
      return false; // Blocks transition completely
    }

    if (phase.completion_behavior === 'auto_resolve_pending') {
      await this.resolvePending(phase);
      return true;
    }

    return false;
  }

  /**
   * 4. Auto Resolution Logic
   */
  private async resolvePending(phase: RuntimePhase): Promise<void> {
    const action = phase.auto_resolve_action || 'auto_reject';
    const newStatus = action === 'auto_approve' ? 'approved' : 'rejected';

    if (phase.phase_type === 'screening') {
      await this.supabase
        .from('candidate')
        .update({ status: newStatus })
        .eq('status', 'pending')
        .eq('electionID', phase.electionID);
    } 
    else if (phase.phase_type === 'appeal') {
      await this.supabase
        .from('appeals')
        .update({ status: newStatus })
        .eq('status', 'pending')
        .eq('electionID', phase.electionID);
    }
  }

  /**
   * 5. Phase Transition Executor
   */
  async transitionToNextPhase(electionId: string): Promise<void> {
    const currentPhase = await this.getCurrentActivePhase(electionId);
    
    if (!currentPhase) {
      throw new Error('No active phase found to transition from.');
    }

    // Validation
    const canMove = await this.canTransition(currentPhase);
    if (!canMove) {
      throw new Error('BLOCKED: Phase cannot transition due to completion behavior constraints.');
    }

    // Mark current phase as completed
    await this.supabase
      .from('election phase')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', currentPhase.id);
    
    await this.onPhaseCompleted(currentPhase);

    // Find Next Phase (must be enabled, strictly next index)
    const { data: nextPhases } = await this.supabase
      .from('election phase')
      .select('*')
      .eq('electionID', electionId)
      .eq('is_enabled', true)
      .gt('phase_index', currentPhase.phase_index)
      .order('phase_index', { ascending: true })
      .limit(1);

    if (nextPhases && nextPhases.length > 0) {
      const nextPhase = nextPhases[0] as RuntimePhase;
      const now = new Date();
      let shouldActivate = false;

      // START DATE LOGIC
      if (!nextPhase.start_date) {
        shouldActivate = true;
      } else {
        const start = new Date(nextPhase.start_date);
        if (start <= now) {
          shouldActivate = true;
        }
      }

      if (shouldActivate) {
        await this.supabase
          .from('election phase')
          .update({ started_at: now.toISOString() })
          .eq('id', nextPhase.id);
        
        await this.onPhaseStarted(nextPhase);
      }
    }
  }

  /**
   * Hooks (Currently placeholders per spec)
   */
  async onPhaseStarted(phase: RuntimePhase): Promise<void> {
     console.log(`[Runtime Orchestrator] Phase Started: ${phase.phase_type}`);

     if (phase.phase_type === 'results') {
       try {
         // Fetch the results config for this election
         const { data: config, error: configErr } = await this.supabase
           .from('results_config')
           .select('*')
           .eq('election_id', phase.electionID)
           .maybeSingle();

         if (configErr) {
           console.error('[PhaseResolverService] Error fetching results config:', configErr);
           return;
         }

         // If publish mode is 'immediate', compute results and mark as published
         if (config && config.publish_mode === 'immediate') {
           console.log(`[PhaseResolverService] Immediate publish mode detected. Computing results for election ${phase.electionID}`);

           // Fetch the election to get tenantID
           const { data: election, error: electionErr } = await this.supabase
             .from('election')
             .select('tenantID')
             .eq('id', phase.electionID)
             .single();

           if (electionErr || !election) {
             console.error('[PhaseResolverService] Error fetching election for tenantID:', electionErr);
             return;
           }

           const { error: rpcError } = await this.supabase.rpc('compute_election_results', {
             p_election_id: phase.electionID,
             p_tenant_id: election.tenantID
           });

           if (rpcError) {
             console.error('[PhaseResolverService] Error computing election results via RPC:', rpcError);
             return;
           }

           const { error: updateError } = await this.supabase
             .from('results_config')
             .update({ published_at: new Date().toISOString() })
             .eq('election_id', phase.electionID);

           if (updateError) {
             console.error('[PhaseResolverService] Error updating results config published_at:', updateError);
           } else {
             console.log(`[PhaseResolverService] Results computed and published successfully for election ${phase.electionID}`);
           }
         }
       } catch (err) {
         console.error('[PhaseResolverService] Exception in onPhaseStarted results handling:', err);
       }
     }
  }

  async onPhaseCompleted(phase: RuntimePhase): Promise<void> {
     // TODO: Finalize metrics, archive records, clean up phase data
     console.log(`[Runtime Orchestrator] Phase Completed: ${phase.phase_type}`);
  }
}
