'use client';

import type { TranslationKeys } from '@/i18n/translations';

interface HeroProps {
  t: TranslationKeys;
  isRtl: boolean;
}

export function Hero({ t, isRtl }: HeroProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ctaArrow = isRtl ? 'M13 8H3M7 4l-4 4 4 4' : 'M3 8h10M9 4l4 4-4 4';

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-eyebrow">{t.features.label}</div>

          <h1 className="hero-title">
            {t.hero.title} <span className="hero-highlight">{t.hero.titleHighlight}</span>
          </h1>

          <p className="hero-sub">{t.hero.subtitle}</p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary hero-cta"
              onClick={() => scrollTo('pricing')}
            >
              {t.hero.cta}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d={ctaArrow}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className="btn-secondary" onClick={() => scrollTo('features')}>
              {t.hero.secondary}
            </button>
          </div>
        </div>

        {/* Dark product mockup below CTAs */}
        <div className="hero-mockup">
          <div className="hero-card">
            <div className="hero-card-top">
              <div className="hero-card-merchant">{t.hero.cardMerchant}</div>
              <div className="hero-card-tier">★ {t.tiers.items[2].name}</div>
            </div>

            <div className="hero-card-pts-row">
              <div>
                <div className="hero-card-pts">12,400</div>
                <div className="hero-card-pts-label">{t.hero.globalPoints}</div>
              </div>
              <div className="hero-card-badges">
                <div className="hero-badge hero-badge-earn">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M6 1v10M1 6h10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t.hero.floatEarned}
                </div>
                <div className="hero-badge hero-badge-redeem">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M10 6H2M6 2l-4 4 4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t.hero.floatRedeemed}
                </div>
              </div>
            </div>

            <div className="hero-card-progress">
              <div className="hero-card-progress-meta">
                <span>{t.hero.cardToTier}</span>
                <span>48%</span>
              </div>
              <div className="hero-card-bar">
                <div className="hero-card-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
