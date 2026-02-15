/**
 * Shared formatting utilities
 *
 * Used across merchant-dashboard and customer-portal for
 * consistent number, currency, and date display.
 */

import { CURRENCY_CODE, LOCALE_AR, LOCALE_EN } from './constants';

export function formatPoints(points: number): string {
  return new Intl.NumberFormat(LOCALE_EN).format(points);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE_EN, {
    style: 'currency',
    currency: CURRENCY_CODE,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE_EN, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return formatDate(date);
}

export function formatPeriodLabel(period: string, language: string): string {
  try {
    const date = new Date(period);
    return new Intl.DateTimeFormat(language === 'ar' ? LOCALE_AR : LOCALE_EN, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return period;
  }
}
