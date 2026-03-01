'use client';

import { PageShell } from '@/components/PageShell';

export default function HelpPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <div className="inner-hero-label">{t.pages.help.title}</div>
            <h1>{t.pages.help.title}</h1>
            <p>{t.pages.help.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <p className="inner-coming-note">{t.pages.help.body}</p>
              <a href={`mailto:${t.pages.help.email}`} className="inner-coming-email">
                {t.pages.help.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
