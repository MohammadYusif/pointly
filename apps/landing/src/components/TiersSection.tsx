'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { CUSTOMER_TIERS, TIER_ORDER } from '@pointly/shared';
import type { CustomerTierLevel } from '@pointly/shared';
import { ScrollReveal } from './ScrollReveal';

interface TiersSectionProps {
  t: TranslationKeys;
}

/** Presentation-only mapping from domain tier level to CSS class name. */
const TIER_CSS_COLOR: Record<CustomerTierLevel, string> = {
  BRONZE: 'bronze',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
};

function TierIcon({ color }: { color: string }) {
  if (color === 'bronze') {
    return (
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 4 L32 10 L32 23 C32 30.5 20 37 20 37 C20 37 8 30.5 8 23 L8 10 Z"
          fill="rgba(205,127,50,0.15)"
          stroke="#cd7f32"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (color === 'gold') {
    return (
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 5 L23 15 L33 16 L25 22 L28 32 L20 26 L12 32 L15 22 L7 16 L17 15 Z"
          fill="rgba(217,119,6,0.15)"
          stroke="#d97706"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (color === 'platinum') {
    return (
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 5 L33 12.5 L33 27.5 L20 35 L7 27.5 L7 12.5 Z"
          fill="rgba(99,102,241,0.15)"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (color === 'diamond') {
    return (
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 3 L36 18 L20 37 L4 18 Z"
          fill="rgba(8,176,162,0.15)"
          stroke="#08b0a2"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
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
          {TIER_ORDER.map((level, i) => {
            const tier = CUSTOMER_TIERS[level];
            const cssColor = TIER_CSS_COLOR[level];
            const name = t.tiers.items[i].name;
            const threshold = `${tier.monthlyMinimum.toLocaleString('en-SA')} ${t.tiers.ptsUnit}`;
            const multiplier = `${tier.earningMultiplier}×`;

            return (
              <ScrollReveal key={level} delay={i + 1}>
                <div className={`tier-card ${cssColor}`}>
                  <div className="tier-icon">
                    <TierIcon color={cssColor} />
                  </div>
                  <div className="tier-name">{name}</div>
                  <div className="tier-threshold">{threshold}</div>
                  <div className="tier-threshold-label">{t.tiers.thresholdLabel}</div>
                  <div className="tier-multiplier">
                    {multiplier} {t.tiers.multiplierLabel}
                  </div>
                  <ul className="tier-benefits">
                    {tier.benefits.map((b) => (
                      <li key={b.key}>
                        <span>{b.icon}</span>
                        <span>{t.tierBenefits[b.key as keyof typeof t.tierBenefits]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
