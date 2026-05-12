'use client';

import { PageShell } from '@/components/PageShell';

export default function HelpPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <h1>{t.pages.help.title}</h1>
            <p>{t.pages.help.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <p className="inner-coming-note">{t.pages.help.body}</p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
