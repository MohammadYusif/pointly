'use client';

import { useTranslation } from '@pointly/i18n';
import { Clock, Home, QrCode, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'qr', href: '/qr', icon: QrCode },
  { key: 'history', href: '/history', icon: Clock },
  { key: 'profile', href: '/profile', icon: User },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { t, language } = useTranslation();
  const pathname = usePathname();

  const labels: Record<string, string> = {
    dashboard: t('navigation.dashboard'),
    qr: language === 'ar' ? 'رمز QR' : 'QR Code',
    history: t('navigation.transactions'),
    profile: t('navigation.profile'),
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-1 text-xs ${
                  isActive ? 'text-[#08b0a2] font-medium' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {labels[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
