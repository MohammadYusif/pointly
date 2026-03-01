'use client';

import { useTranslation } from '@pointly/i18n';
import { LanguageToggle } from '@pointly/ui';
import { Clock, Home, QrCode, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'qr', href: '/qr', icon: QrCode },
  { key: 'merchants', href: '/enroll', icon: Store },
  { key: 'history', href: '/history', icon: Clock },
  { key: 'profile', href: '/profile', icon: User },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  const labels: Record<string, string> = {
    dashboard: t('navigation.dashboard'),
    qr: t('navigation.qr'),
    merchants: t('navigation.merchants'),
    history: t('navigation.transactions'),
    profile: t('navigation.profile'),
  };

  return (
    <div className="portal-layout">
      <header className="portal-header sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <img src="/logo.svg" alt="Pointly" style={{ height: '22px', width: 'auto' }} />
          <LanguageToggle showLabel={false} />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">
        <div key={pathname} className="animate-fade-in">
          {children}
        </div>
      </main>
      <nav className="portal-nav fixed bottom-0 inset-x-0">
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
                className={`flex flex-col items-center gap-1 px-4 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-[#08b0a2] font-medium'
                    : 'text-muted-foreground hover:text-foreground'
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
