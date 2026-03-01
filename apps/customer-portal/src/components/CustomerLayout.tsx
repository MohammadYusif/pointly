'use client';

import { getCurrentSession, signOut } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { LanguageToggle } from '@pointly/ui';
import { Clock, Home, LogOut, QrCode, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PointlyLogo } from './PointlyLogo';

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
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Guard: redirect to login if no valid session
  useEffect(() => {
    getCurrentSession().then((token) => {
      if (!token) {
        router.replace('/');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleLogout = () => {
    signOut();
    router.push('/');
  };

  const labels: Record<string, string> = {
    dashboard: t('navigation.dashboard'),
    qr: t('navigation.qr'),
    merchants: t('navigation.merchants'),
    history: t('navigation.transactions'),
    profile: t('navigation.profile'),
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#08b0a2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="portal-layout">
      <header className="portal-header sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <PointlyLogo height={22} />
          <div className="flex items-center gap-1">
            <LanguageToggle showLabel={false} />
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('auth.logout')}
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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
