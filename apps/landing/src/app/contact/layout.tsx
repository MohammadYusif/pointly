import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'تواصل معنا | Contact — Pointly',
  robots: { index: false, follow: false },
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
