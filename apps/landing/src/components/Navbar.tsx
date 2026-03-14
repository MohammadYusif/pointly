'use client';

import type { Locale, TranslationKeys } from '@/i18n/translations';
import type { BezierDefinition } from 'framer-motion';
import { motion, useReducedMotion } from 'framer-motion';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];
import { useEffect, useState } from 'react';

interface NavbarProps {
  t: TranslationKeys;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}

export function Navbar({ t, locale, onLocaleChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      className={`nav${scrolled ? ' scrolled' : ''}`}
      initial={prefersReducedMotion ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="container">
        <div className="nav-inner">
          {/* Logo */}
          <div className="nav-logo">
            <img src="/logo.svg" alt="Pointly" height={36} />
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
              className="btn-primary nav-cta"
              onClick={() => scrollTo('pricing')}
            >
              {t.nav.getStarted}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
