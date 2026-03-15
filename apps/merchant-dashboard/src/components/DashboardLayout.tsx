'use client';

import { Logo } from '@/components/Logo';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@pointly/i18n';
import { Button, Container, type NavItem, Navbar } from '@pointly/ui';
import { type BezierDefinition, motion, useReducedMotion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('navigation.dashboard'), href: '/', active: isActive('/') },
    {
      key: 'customers',
      label: t('navigation.customers'),
      href: '/customers',
      active: isActive('/customers'),
    },
    {
      key: 'transactions',
      label: t('navigation.transactions'),
      href: '/transactions',
      active: isActive('/transactions'),
    },
    {
      key: 'manual-entry',
      label: t('navigation.loyalty'),
      href: '/manual-entry',
      active: isActive('/manual-entry'),
    },
    {
      key: 'redeem',
      label: t('redeem.title'),
      href: '/redeem',
      active: isActive('/redeem'),
    },
    {
      key: 'marketing',
      label: t('navigation.marketing'),
      href: '/marketing',
      active: isActive('/marketing'),
    },
    {
      key: 'settings',
      label: t('navigation.settings'),
      href: '/settings',
      active: isActive('/settings'),
    },
    {
      key: 'billing',
      label: t('navigation.billing'),
      href: '/billing',
      active: isActive('/billing'),
    },
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className="dashboard-bg overflow-x-hidden">
      <Navbar
        items={navItems}
        onNavItemClick={handleNavClick}
        logo={<Logo width={120} className="md:w-35" />}
        showLanguageToggle
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title={t('auth.logout')}
            className="icon-hover-rotate"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        }
      />
      <motion.main
        className="py-4 md:py-8"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <Container>
          <PageTransition>{children}</PageTransition>
        </Container>
      </motion.main>
    </div>
  );
}
