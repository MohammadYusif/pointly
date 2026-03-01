'use client';

import { PageShell } from '@/components/PageShell';

export default function StatusPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <div className="inner-hero-label">{t.pages.status.title}</div>
            <h1>{t.pages.status.title}</h1>
            <p>{t.pages.status.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <div className="status-badge">
                <span className="status-dot" />
                {t.pages.status.operational}
              </div>
              <p className="inner-coming-note">{t.pages.status.noIncidents}</p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
