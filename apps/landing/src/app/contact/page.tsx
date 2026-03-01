'use client';

import { PageShell } from '@/components/PageShell';

export default function ContactPage() {
  return (
    <PageShell>
      {(t) => (
        <div className="container">
          <div className="inner-hero">
            <div className="inner-hero-label">{t.pages.contact.title}</div>
            <h1>{t.pages.contact.title}</h1>
            <p>{t.pages.contact.subtitle}</p>
          </div>
          <div className="inner-body">
            <div className="inner-coming">
              <a href={`mailto:${t.pages.contact.email}`} className="inner-coming-email">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M2 4h12v9H2zM2 4l6 5 6-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t.pages.contact.email}
              </a>
              <p className="inner-coming-note">{t.pages.contact.note}</p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
