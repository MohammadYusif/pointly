'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface PricingSectionProps {
  t: TranslationKeys;
}

export function PricingSection({ t }: PricingSectionProps) {
  return (
    <section className="section" id="pricing">
      <div className="container">
        <ScrollReveal>
          <div className="section-label">{t.pricing.label}</div>
          <h2 className="section-title">{t.pricing.title}</h2>
          <p className="section-sub">{t.pricing.subtitle}</p>
        </ScrollReveal>

        <div className="pricing-grid">
          {t.pricing.plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i + 1}>
              <div className={`pricing-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">{t.pricing.mostPopular}</div>}
                <div className="pricing-plan">{plan.name}</div>
                <div className="pricing-price">
                  {plan.price} <span>{t.pricing.perMonth}</span>
                </div>
                <p className="pricing-desc">{plan.desc}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="pricing-feature">
                      <svg
                        className="pricing-feature-check"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button type="button" className="pricing-cta">
                  {plan.cta}
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
