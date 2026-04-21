'use client';

import type { Locale, TranslationKeys } from '@/i18n/translations';
import type { BezierDefinition } from 'framer-motion';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];
import { useEffect, useState } from 'react';

interface NavbarProps {
  t: TranslationKeys;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}

export function Navbar({ t, locale, onLocaleChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      className={`nav${scrolled || mobileOpen ? ' scrolled' : ''}`}
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

          {/* Desktop actions */}
          <div className="nav-actions">
            <a
              href={process.env.NEXT_PUBLIC_CUSTOMER_URL ?? 'https://d33qgcnm1sph18.cloudfront.net'}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link portal-link"
            >
              {t.nav.customerPortal}
            </a>
            <a
              href={process.env.NEXT_PUBLIC_MERCHANT_URL ?? 'https://d62obmvn36z3a.cloudfront.net'}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link portal-link"
            >
              {t.nav.login}
            </a>
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

          {/* Mobile hamburger */}
          <button
            type="button"
            className={`nav-hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="mobile-menu-links">
              {[
                { label: t.nav.features, id: 'features' },
                { label: t.nav.network, id: 'network' },
                { label: t.nav.tiers, id: 'tiers' },
                { label: t.nav.pricing, id: 'pricing' },
                { label: t.nav.about, id: 'about' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="mobile-menu-link"
                  onClick={() => scrollTo(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mobile-menu-divider" />

            <div className="mobile-menu-portals">
              <a
                href={
                  process.env.NEXT_PUBLIC_CUSTOMER_URL ?? 'https://d33qgcnm1sph18.cloudfront.net'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-menu-link"
              >
                {t.nav.customerPortal}
              </a>
              <a
                href={
                  process.env.NEXT_PUBLIC_MERCHANT_URL ?? 'https://d62obmvn36z3a.cloudfront.net'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-menu-link"
              >
                {t.nav.login}
              </a>
            </div>

            <div className="mobile-menu-divider" />

            <div className="mobile-menu-actions">
              <button
                type="button"
                className="lang-toggle"
                onClick={() => onLocaleChange(locale === 'en' ? 'ar' : 'en')}
              >
                {locale === 'en' ? 'العربية' : 'English'}
              </button>
              <button type="button" className="btn-primary" onClick={() => scrollTo('pricing')}>
                {t.nav.getStarted}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
