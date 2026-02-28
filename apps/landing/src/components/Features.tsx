import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface FeaturesProps {
  t: TranslationKeys;
}

const ICONS = ['⚡', '🔗', '🏆', '✏️', '📊', '💳'];

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
