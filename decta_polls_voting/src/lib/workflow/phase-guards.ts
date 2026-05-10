import { PhaseStatus, RuntimePhase } from './PhaseResolverService';

/**
 * Check if the current phase type is in the allowed set.
 * Always use PhaseResolverService as the source of truth — this is a pure predicate.
 */
export function isPhaseAllowed(
  currentPhase: RuntimePhase | null,
  allowedPhases: string[]
): boolean {
  if (!currentPhase) return false;
  return allowedPhases.includes(currentPhase.phase_type);
}

/**
 * Check if the current phase is in an actionable state
 * (not waiting for transition, not upcoming).
 */
export function isPhaseActionable(phaseStatus: PhaseStatus | null): boolean {
  return phaseStatus === 'active';
}

/**
 * Combined guard: checks BOTH phase validity AND permission.
 * Use this before enabling any destructive or state-changing UI action.
 */
export function canPerformAction(
  currentPhase: RuntimePhase | null,
  allowedPhases: string[],
  phaseStatus: PhaseStatus | null,
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  // Phase check
  if (!isPhaseAllowed(currentPhase, allowedPhases)) return false;
  if (!isPhaseActionable(phaseStatus)) return false;

  // Permission check
  if (userPermissions.includes('*')) return true; // Owner bypass
  if (requiredPermissions.length === 0) return true; // No specific perm required
  return requiredPermissions.some(p => userPermissions.includes(p));
}

/**
 * Client-side phase status resolver.
 * Mirrors PhaseResolverService.resolvePhaseStatus() — kept as a pure function
 * so client components can resolve without a Supabase instance.
 */
export function resolvePhaseStatusClient(phase: RuntimePhase, now: Date = new Date()): PhaseStatus {
  if (phase.completed_at) return 'completed';

  if (phase.transition_mode === 'deadline') {
    const startDate = phase.start_date ? new Date(phase.start_date) : null;
    const deadline = phase.deadline ? new Date(phase.deadline) : null;

    if (startDate && now < startDate) return 'upcoming';
    if (deadline && now > deadline) return 'for_transition';

    if (startDate && startDate <= now && (!deadline || now <= deadline)) return 'active';
    if (!startDate && deadline && now <= deadline) return 'active';

    return 'upcoming';
  }

  if (phase.transition_mode === 'manual') {
    if (!phase.started_at) return 'upcoming';
    if (phase.started_at && !phase.completed_at) return 'active';
  }

  return 'upcoming';
}
