'use client';

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
    <div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/register">
          <Button variant="ghost" className="px-0">
            ← {t('common.back')}
          </Button>
        </Link>
      </div>

      <img
        src="/logo.svg"
        alt="Pointly"
        style={{ height: '28px', width: 'auto', marginBottom: '24px' }}
      />

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#21242d' }}>
        {t('terms.title')}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#71717a' }}>
        {t('terms.lastUpdated')}
      </p>

      <p className="mb-6" style={{ color: '#21242d' }}>
        {t('terms.intro')}
      </p>

      <div className="space-y-5">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-semibold mb-1" style={{ color: '#21242d' }}>
              {s.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#52525b' }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
