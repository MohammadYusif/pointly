import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface AboutSectionProps {
  t: TranslationKeys;
}

const VALUE_ICONS = [
  <svg key="1" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 1.5C5 1.5 2 5 2 9s3 7.5 7 7.5 7-3 7-7.5-3-7.5-7-7.5z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="2" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  <svg key="3" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="9" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="9" cy="15.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="2.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
];

export function AboutSection({ t }: AboutSectionProps) {
  return (
    <section className="section" id="about" style={{ background: 'rgba(8,176,162,0.015)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div className="about-layout">
          {/* Text */}
          <ScrollReveal>
            <div className="section-label">{t.about.label}</div>
            <h2 className="section-title">{t.about.title}</h2>
            <p className="section-sub">{t.about.subtitle}</p>

            <div className="about-values">
              {t.about.values.map((value, i) => (
                <div key={i} className="about-value">
                  <div className="about-value-icon">{VALUE_ICONS[i]}</div>
                  <div>
                    <div className="about-value-title">{value.title}</div>
                    <div className="about-value-desc">{value.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Card stack */}
          <ScrollReveal delay={1}>
            <div className="about-cards">
              {t.about.cards.map((card, i) => (
                <div key={i} className="about-card-item">
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
