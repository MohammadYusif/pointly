import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'الوظائف | Careers — Pointly',
  robots: { index: false, follow: false },
};

export default function CareersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
