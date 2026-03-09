'use client';

import { getCurrentSession, signOut } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { LanguageToggle } from '@pointly/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Home, LogOut, QrCode, Store, User, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PointlyLogo } from './PointlyLogo';

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'qr', href: '/qr', icon: QrCode },
  { key: 'merchants', href: '/merchants', icon: Store },
  { key: 'wallet', href: '/wallet', icon: Wallet },
  { key: 'profile', href: '/profile', icon: User },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentSession().then((token) => {
      if (!token) {
        // Hard navigation so the login page loads fresh (breaks any client-side loop).
        // The ?expired=1 marker tells the login page not to auto-redirect back.
        window.location.replace('/?expired=1');
      } else {
        setChecking(false);
      }
    });
    // Intentionally empty deps: run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    queryClient.clear();
    signOut();
    router.push('/');
  };

  const labels: Record<string, string> = {
    dashboard: t('navigation.dashboard'),
    qr: t('navigation.qr'),
    merchants: t('navigation.merchants'),
    wallet: t('navigation.wallet'),
    profile: t('navigation.profile'),
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="portal-layout">
      {/* Ambient glow orbs — matching landing page */}
      <div className="portal-orb portal-orb-teal" aria-hidden="true" />
      <div className="portal-orb portal-orb-navy" aria-hidden="true" />
      <div className="portal-orb portal-orb-orange" aria-hidden="true" />

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
                className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[11px] leading-tight transition-colors ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[4.5rem] text-center">
                  {labels[item.key]}
                </span>
                {isActive && <span className="nav-active-dot" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
