import { type ClassValue, clsx } from 'clsx';
import { type BezierDefinition } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export formatting utilities from shared package
export { formatPoints, formatCurrency, formatDate, formatRelativeTime } from '@pointly/shared';

/** Extract numeric amount — handles both `{amount, currency}` object and plain number */
export function getAmount(amount: unknown): number {
  if (typeof amount === 'number') return amount;
  if (amount && typeof amount === 'object' && 'amount' in amount) {
    return (amount as { amount: number }).amount;
  }
  return 0;
}

/** Shared easing curve used across all motion animations */
export const EASE: BezierDefinition = [0.16, 1, 0.3, 1];
