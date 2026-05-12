'use client';

import { PageShell } from '@/components/PageShell';

export default function CareersPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <h1>{t.pages.careers.title}</h1>
            <p>{t.pages.careers.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <p className="inner-coming-note">{t.pages.careers.body}</p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
