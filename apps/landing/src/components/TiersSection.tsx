import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface TiersSectionProps {
  t: TranslationKeys;
}

export function TiersSection({ t }: TiersSectionProps) {
  return (
    <section className="section" id="tiers">
      <div className="container">
        <ScrollReveal>
          <div className="section-label">{t.tiers.label}</div>
          <h2 className="section-title">{t.tiers.title}</h2>
          <p className="section-sub">{t.tiers.subtitle}</p>
        </ScrollReveal>

        <div className="tiers-grid">
          {t.tiers.items.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={(i + 1) as 1 | 2 | 3 | 4}>
              <div className={`tier-card ${tier.color}`}>
                <div className="tier-emoji">{tier.emoji}</div>
                <div className="tier-name">{tier.name}</div>
                <div className="tier-threshold">{tier.threshold}</div>
                <div className="tier-threshold-label">{t.tiers.thresholdLabel}</div>
                <div className="tier-multiplier">
                  {tier.multiplier} {t.tiers.multiplierLabel}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
