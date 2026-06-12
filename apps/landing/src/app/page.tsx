'use client';

import { AboutSection } from '@/components/AboutSection';
import { CTASection } from '@/components/CTASection';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Navbar } from '@/components/Navbar';
import { NetworkSection } from '@/components/NetworkSection';
import { PricingSection } from '@/components/PricingSection';
import { StatsBar } from '@/components/StatsBar';
import { TiersSection } from '@/components/TiersSection';
import { type Locale, translations } from '@/i18n/translations';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  // Always start from the SSG default ('ar') so the first client render
  // matches the exported HTML — reading localStorage in the initializer
  // causes a hydration text mismatch (React #418).
  const [locale, setLocale] = useState<Locale>('ar');
  const t = translations[locale];
  const isRtl = locale === 'ar';

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('pointly-language', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  };

  // Sync stored language preference after hydration
  useEffect(() => {
    const stored = localStorage.getItem('pointly-language');
    if (stored === 'en' || stored === 'ar') {
      setLocale(stored);
    }
  }, []);

  // Set initial HTML attributes
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  return (
    <>
      <Navbar t={t} locale={locale} onLocaleChange={handleLocaleChange} />
      <main>
        <Hero t={t} isRtl={isRtl} />
        <StatsBar t={t} />
        <Features t={t} />
        <NetworkSection t={t} />
        <TiersSection t={t} />
        <PricingSection t={t} />
        <AboutSection t={t} />
        <CTASection t={t} isRtl={isRtl} />
      </main>
      <Footer t={t} />
    </>
  );
}
