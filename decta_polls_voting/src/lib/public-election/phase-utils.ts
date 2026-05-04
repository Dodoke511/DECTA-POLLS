import { PhaseType } from '../types/phase';

export interface PhaseState {
  id: string;
  phase_type: PhaseType;
  phase_index: number;
  is_enabled: boolean;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Determines if a specific phase type is currently active based on timestamps.
 * Filing has an exception: it is the entry point of the workflow.
 */
export function isPhaseActive(phases: PhaseState[], type: PhaseType): boolean {
  const phase = phases.find(p => p.phase_type === type);
  if (!phase || !phase.is_enabled) return false;

  // Exception for Filing: If it's started and not completed, it's active.
  // We also treat it as the "default" active phase if it's the first enabled phase 
  // and has a started_at timestamp (which is set on election launch).
  return !!phase.started_at && !phase.completed_at;
}

/**
 * A phase is reachable if it is currently active OR has already been completed.
 */
export function isPhaseReachable(phases: PhaseState[], type: PhaseType): boolean {
  const phase = phases.find(p => p.phase_type === type);
  if (!phase || !phase.is_enabled) return false;

  // If it has started, it's either active or completed, thus reachable.
  return !!phase.started_at;
}

/**
 * Returns the currently active phase in the sequence.
 */
export function getActivePhase(phases: PhaseState[]): PhaseState | null {
  // Sort by index to ensure we find the "earliest" active phase if multiple exist (though they shouldn't)
  const sortedPhases = [...phases]
    .filter(p => p.is_enabled)
    .sort((a, b) => a.phase_index - b.phase_index);

  return sortedPhases.find(p => !!p.started_at && !p.completed_at) || null;
}

/**
 * Helper to check if a phase is explicitly completed
 */
export function isPhaseCompleted(phases: PhaseState[], type: PhaseType): boolean {
  const phase = phases.find(p => p.phase_type === type);
  return !!(phase?.started_at && phase?.completed_at);
}
