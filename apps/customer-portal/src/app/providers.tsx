'use client';

import { DirectionProvider } from '@pointly/i18n';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider defaultLanguage="ar">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </DirectionProvider>
  );
}
