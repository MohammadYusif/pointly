'use client';

import type { Locale, TranslationKeys } from '@/i18n/translations';
import { useEffect, useState } from 'react';

interface NavbarProps {
  t: TranslationKeys;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}

export function Navbar({ t, locale, onLocaleChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <div className="nav-inner">
          {/* Logo */}
          <div className="nav-logo">
            <div className="nav-logo-dot">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="3" fill="white" />
                <circle cx="8" cy="2" r="1.5" fill="white" opacity="0.7" />
                <circle cx="14" cy="8" r="1.5" fill="white" opacity="0.7" />
                <circle cx="8" cy="14" r="1.5" fill="white" opacity="0.7" />
                <circle cx="2" cy="8" r="1.5" fill="white" opacity="0.7" />
              </svg>
            </div>
            Pointly
          </div>

          {/* Desktop nav links */}
          <ul className="nav-links">
            {[
              { label: t.nav.features, id: 'features' },
              { label: t.nav.network, id: 'network' },
              { label: t.nav.tiers, id: 'tiers' },
              { label: t.nav.pricing, id: 'pricing' },
              { label: t.nav.about, id: 'about' },
            ].map((item) => (
              <li key={item.id}>
                <button type="button" className="nav-link" onClick={() => scrollTo(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="nav-actions">
            <button
              type="button"
              className="lang-toggle"
              onClick={() => onLocaleChange(locale === 'en' ? 'ar' : 'en')}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 18px' }}
              onClick={() => scrollTo('pricing')}
            >
              {t.nav.getStarted}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
