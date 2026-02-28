import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface CTASectionProps {
  t: TranslationKeys;
}

export function CTASection({ t }: CTASectionProps) {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-inner">
          <ScrollReveal>
            <div className="section-label">{t.cta.label}</div>
            <h2 className="section-title">{t.cta.title}</h2>
            <p className="section-sub">{t.cta.subtitle}</p>

            <div className="cta-actions">
              <a href="#" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px', borderRadius: '12px' }}>
                {t.cta.primary}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <p className="cta-note">{t.cta.note}</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
