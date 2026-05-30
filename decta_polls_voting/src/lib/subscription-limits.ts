import type { PhaseType } from './types/phase';

export type SubscriptionTier = 'BASIC' | 'STANDARD' | 'ENTERPRISE';
export type SubscriptionState = SubscriptionTier | 'EXPIRED' | 'PENDING';

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

export function getDisplaySubscription(subscription?: string | null, expiresAt?: string | null): SubscriptionState {
  const value = (subscription ?? '').toUpperCase();
  if (value === 'EXPIRED' || value === 'PENDING') return value;

  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
      return 'EXPIRED';
    }
  }

  if (value === 'STANDARD' || value === 'ENTERPRISE' || value === 'BASIC') {
    return value as SubscriptionState;
  }

  return 'BASIC';
}

export function getDaysUntilExpiry(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const diffMs = expiryDate.getTime() - Date.now();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isSubscriptionExpiringSoon(expiresAt?: string | null, thresholdDays = 10): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);
  return daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= thresholdDays;
}

export function isSubscriptionRestricted(subscription?: string | null, expiresAt?: string | null): boolean {
  const current = getDisplaySubscription(subscription, expiresAt);
  return current === 'EXPIRED' || current === 'PENDING';
}

export function canUsePhase(subscription: SubscriptionTier, phaseType: PhaseType): boolean {
  if (BASIC_PHASES.includes(phaseType)) return true;
  if (subscription === 'BASIC') return false;
  if (subscription === 'STANDARD') return phaseType !== 'publication';
  return true;
}

export function canUseInterfaceBuilder(subscription: SubscriptionTier): boolean {
  return subscription === 'ENTERPRISE' || subscription === 'STANDARD';
}

export function canUseAppeals(subscription: SubscriptionTier): boolean {
  return subscription !== 'BASIC';
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
