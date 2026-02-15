'use client';

import { type Language, useDirection } from '../context/DirectionContext';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

const translations: Record<Language, Translations> = { en, ar };

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if path not found
    }
  }

  return typeof value === 'string' ? value : path;
}

/**
 * Replace placeholders in a string with provided values
 * Supports {{key}} syntax
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key]?.toString() ?? `{{${key}}}`;
  });
}

export function useTranslation() {
  const { language } = useDirection();

  /**
   * Translate a key with optional parameter interpolation
   * @param key - Dot notation path to translation (e.g., 'common.save')
   * @param params - Optional parameters for interpolation
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[language] as Record<string, unknown>, key);
    return interpolate(value, params);
  };

  /** The Intl locale string for the current language */
  const locale = language === 'ar' ? 'ar-SA' : 'en-SA';

  /**
   * Format a number according to the current locale
   * Uses Arabic numerals when in Arabic mode
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(locale).format(num);
  };

  /**
   * Format currency in SAR
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  /**
   * Format a date according to the current locale
   */
  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...options,
    }).format(dateObj);
  };

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  const formatRelativeTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    }
    if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    }
    if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    }
    if (diffInSeconds < 604800) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }

    return formatDate(dateObj);
  };

  return {
    t,
    language,
    locale,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };
}
