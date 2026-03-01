'use client';

import { PageShell } from '@/components/PageShell';

export default function BlogPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <div className="inner-hero-label">{t.pages.blog.title}</div>
            <h1>{t.pages.blog.title}</h1>
            <p>{t.pages.blog.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <p className="inner-coming-note">{t.pages.blog.empty}</p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
