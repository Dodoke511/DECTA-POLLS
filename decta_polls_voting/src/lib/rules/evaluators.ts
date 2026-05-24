import { Operator } from '@/lib/types/screening';

/**
 * Pure condition evaluator — no side effects, no DB calls.
 * Compares a candidate's submitted field value against the rule's threshold.
 */
export function evaluateCondition(
  operator: Operator,
  rawFieldValue: string | null | undefined,
  ruleValue: string | number | boolean | null,
): boolean {
  // Normalize to string for comparison
  const fieldVal = rawFieldValue?.trim() ?? '';

  switch (operator) {
    case 'eq':
      return fieldVal === String(ruleValue);

    case 'neq':
      return fieldVal !== String(ruleValue);

    case 'gt': {
      const n = parseFloat(fieldVal);
      return !isNaN(n) && n > Number(ruleValue);
    }

    case 'gte': {
      const n = parseFloat(fieldVal);
      return !isNaN(n) && n >= Number(ruleValue);
    }

    case 'lt': {
      const n = parseFloat(fieldVal);
      return !isNaN(n) && n < Number(ruleValue);
    }

    case 'lte': {
      const n = parseFloat(fieldVal);
      return !isNaN(n) && n <= Number(ruleValue);
    }

    case 'contains':
      return fieldVal.toLowerCase().includes(String(ruleValue).toLowerCase());

    case 'not_contains':
      return !fieldVal.toLowerCase().includes(String(ruleValue).toLowerCase());

    case 'is_checked':
      return fieldVal === 'true' || fieldVal === '1' || fieldVal === 'yes';

    case 'is_unchecked':
      return fieldVal === 'false' || fieldVal === '0' || fieldVal === 'no' || fieldVal === '';

    default:
      return true; // Unknown operator — pass by default (safe fail-open)
  }
}
