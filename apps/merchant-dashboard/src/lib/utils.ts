import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export formatting utilities from shared package
export { formatPoints, formatCurrency, formatDate, formatRelativeTime } from '@pointly/shared';
