'use client';

import { AuthProvider } from '@/lib/auth-context';
import { DirectionProvider } from '@pointly/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  // Delay rendering until after hydration so the correct language is used,
  // preventing hydration mismatch between server (Arabic) and client (user's language).
  useEffect(() => {
    setReady(true);
    document.documentElement.classList.remove('notready');
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider defaultLanguage="ar">
        <AuthProvider>{children}</AuthProvider>
      </DirectionProvider>
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3000 }} />
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
