import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'شروط الخدمة | Terms of Service — Pointly',
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
