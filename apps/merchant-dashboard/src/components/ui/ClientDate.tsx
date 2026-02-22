'use client';

import { useEffect, useState } from 'react';

interface ClientDateProps {
  date: string | Date;
  format?: 'date' | 'datetime';
  locale?: string;
  placeholder?: string;
}

/**
 * Renders a date safely on the client side only, avoiding hydration mismatches.
 *
 * With `output: 'export'` (static export), pages are pre-rendered at build time
 * with the build machine's timezone. Users may be in a different timezone, causing
 * the client to format dates differently than the server — resulting in a mismatch.
 *
 * This component renders a neutral placeholder on first render (matching server
 * output), then formats the real date after hydration via useEffect.
 */
export function ClientDate({ date, format = 'date', locale, placeholder = '-' }: ClientDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    const d = typeof date === 'string' ? new Date(date) : date;
    setFormatted(format === 'datetime' ? d.toLocaleString(locale) : d.toLocaleDateString(locale));
  }, [date, format, locale]);

  if (!formatted) return <>{placeholder}</>;
  return <>{formatted}</>;
}
