'use client';

import { DirectionProvider } from '@pointly/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider defaultLanguage="ar">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </DirectionProvider>
    </QueryClientProvider>
  );
}
