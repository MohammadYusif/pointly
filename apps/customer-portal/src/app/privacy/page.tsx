'use client';

import { useTranslation } from '@pointly/i18n';
import { Button } from '@pointly/ui';
import Link from 'next/link';

export default function PrivacyPage() {
  const { t } = useTranslation();

  const sections = [
    { title: t('privacy.section1Title'), body: t('privacy.section1Body') },
    { title: t('privacy.section2Title'), body: t('privacy.section2Body') },
    { title: t('privacy.section3Title'), body: t('privacy.section3Body') },
    { title: t('privacy.section4Title'), body: t('privacy.section4Body') },
    { title: t('privacy.section5Title'), body: t('privacy.section5Body') },
    { title: t('privacy.section6Title'), body: t('privacy.section6Body') },
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
        {t('privacy.title')}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#71717a' }}>
        {t('privacy.lastUpdated')}
      </p>

      <p className="mb-6" style={{ color: '#21242d' }}>
        {t('privacy.intro')}
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
