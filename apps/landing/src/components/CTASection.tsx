import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface CTASectionProps {
  t: TranslationKeys;
}

export function CTASection({ t }: CTASectionProps) {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-box">
          <div className="cta-inner">
            <ScrollReveal>
              <div className="section-label">{t.cta.label}</div>
              <h2 className="section-title">{t.cta.title}</h2>
              <p className="section-sub">{t.cta.subtitle}</p>

              <div className="cta-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  {t.cta.primary}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="cta-note">{t.cta.note}</p>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
