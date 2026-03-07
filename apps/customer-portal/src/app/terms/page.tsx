'use client';

import { PointlyLogo } from '@/components/PointlyLogo';
import { useTranslation } from '@pointly/i18n';
import { Button } from '@pointly/ui';
import Link from 'next/link';

export default function TermsPage() {
  const { t } = useTranslation();

  const sections = [
    { title: t('terms.section1Title'), body: t('terms.section1Body') },
    { title: t('terms.section2Title'), body: t('terms.section2Body') },
    { title: t('terms.section3Title'), body: t('terms.section3Body') },
    { title: t('terms.section4Title'), body: t('terms.section4Body') },
    { title: t('terms.section5Title'), body: t('terms.section5Body') },
  ];

  return (
    <div className="inner-page">
      <div className="inner-page-card">
        <div className="mb-6">
          <Link href="/register">
            <Button variant="ghost" className="px-0">
              ← {t('common.back')}
            </Button>
          </Link>
        </div>

        <PointlyLogo height={28} className="mb-6" />

        <h1 className="text-2xl font-bold mb-1 text-foreground">{t('terms.title')}</h1>
        <p className="text-sm mb-6 text-muted-foreground">{t('terms.lastUpdated')}</p>

        <p className="mb-6 text-foreground">{t('terms.intro')}</p>

        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-semibold mb-1 text-foreground">{s.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
