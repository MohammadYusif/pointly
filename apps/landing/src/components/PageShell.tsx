'use client';

import { Footer } from '@/components/Footer';
import { type Locale, type TranslationKeys, translations } from '@/i18n/translations';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PageShellNavProps {
  t: TranslationKeys;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}

function PageShellNav({ t, locale, onLocaleChange }: PageShellNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <div className="nav-inner">
          <div className="nav-logo">
            <Link href="/">
              <img src="/logo.svg" alt="Pointly" height={36} />
            </Link>
          </div>

          <ul className="nav-links">
            {[
              { label: t.nav.features, href: '/#features' },
              { label: t.nav.network, href: '/#network' },
              { label: t.nav.tiers, href: '/#tiers' },
              { label: t.nav.pricing, href: '/#pricing' },
              { label: t.nav.about, href: '/#about' },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <button
              type="button"
              className="lang-toggle"
              onClick={() => onLocaleChange(locale === 'en' ? 'ar' : 'en')}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link href="/#pricing" className="btn-primary btn-primary--sm">
              {t.nav.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface PageShellProps {
  children: (t: TranslationKeys, isRtl: boolean) => React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  // Start from the SSG default ('ar') so the first client render matches
  // the exported HTML — localStorage is synced after hydration.
  const [locale, setLocale] = useState<Locale>('ar');
  const t = translations[locale];
  const isRtl = locale === 'ar';

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('pointly-language', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    const stored = localStorage.getItem('pointly-language');
    if (stored === 'en' || stored === 'ar') {
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  return (
    <>
      <PageShellNav t={t} locale={locale} onLocaleChange={handleLocaleChange} />
      <main className="inner-main">{children(t, isRtl)}</main>
      <Footer t={t} />
    </>
  );
}
