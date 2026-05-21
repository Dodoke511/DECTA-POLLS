import type { PhaseType } from './types/phase';

export type SubscriptionTier = 'BASIC' | 'STANDARD' | 'ENTERPRISE';

export const SUBSCRIPTION_USER_LIMITS: Record<SubscriptionTier, number | null> = {
  BASIC: 200,
  STANDARD: 500,
  ENTERPRISE: null, // null represents unlimited
};

export const BASIC_PHASES: PhaseType[] = ['filing', 'voting', 'results'];

export function normalizeSubscription(value?: string | null): SubscriptionTier {
  if (value === 'STANDARD' || value === 'ENTERPRISE') return value;
  return 'BASIC';
}

export function canUsePhase(subscription: SubscriptionTier, phaseType: PhaseType): boolean {
  if (BASIC_PHASES.includes(phaseType)) return true;
  if (subscription === 'BASIC') return false;
  if (subscription === 'STANDARD') return phaseType !== 'publication';
  return true;
}

export function canUseInterfaceBuilder(subscription: SubscriptionTier): boolean {
  return subscription === 'ENTERPRISE';
}

export function enforcePhaseAccess<T extends { phase_type: PhaseType; is_enabled: boolean }>(
  phases: T[],
  subscription: SubscriptionTier
): T[] {
  return phases.map(phase => ({
    ...phase,
    is_enabled: canUsePhase(subscription, phase.phase_type) ? phase.is_enabled : false,
  }));
}

export const BASIC_PUBLIC_SITE_COLORS = {
  primary: '#4b5563',
  secondary: '#9ca3af',
  third: '#e5e7eb',
};
