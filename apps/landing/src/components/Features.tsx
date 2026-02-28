import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface FeaturesProps {
  t: TranslationKeys;
}

const ICONS = [
  // Instant Setup
  <svg key="1" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>,
  // Dual Points
  <svg key="2" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="7" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="13" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
  // Smart Tiers
  <svg key="3" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4 15h3v-5H4v5zm4.5 0h3v-9h-3v9zM13 15h3V6h-3v9z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>,
  // Manual Entry
  <svg key="4" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  // Dashboard
  <svg key="5" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
  // Redemption
  <svg key="6" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 7v6M8 9l2-2 2 2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
];

export function Features({ t }: FeaturesProps) {
  return (
    <section className="section" id="features">
      <div className="container">
        <ScrollReveal>
          <div className="section-label">{t.features.label}</div>
          <h2 className="section-title">{t.features.title}</h2>
          <p className="section-sub">{t.features.subtitle}</p>
        </ScrollReveal>

        <div className="features-grid">
          {t.features.items.map((item, i) => (
            <ScrollReveal key={item.title} delay={((i % 3) + 1) as 1 | 2 | 3}>
              <div className="feature-card">
                <div className="feature-icon">{ICONS[i]}</div>
                <div className="feature-title">{item.title}</div>
                <div className="feature-desc">{item.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
