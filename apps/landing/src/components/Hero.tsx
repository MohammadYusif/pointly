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
  const redeemArrow = isRtl ? 'M12 7H2M6 3l-4 4 4 4' : 'M2 7h10M8 3l4 4-4 4';

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          {/* Left: text — animated via CSS hero-item-in keyframes */}
          <div className="hero-text">
            <h1 className="hero-title">
              {t.hero.title} <span className="highlight">{t.hero.titleHighlight}</span>
            </h1>

            <p className="hero-sub">{t.hero.subtitle}</p>

            <div className="hero-actions">
              <button type="button" className="btn-primary" onClick={() => scrollTo('pricing')}>
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

          {/* Right: card mockup — animated via CSS hero-card-in keyframe */}
          <div className="hero-visual">
            <div className="hero-card-wrap">
              <div className="hero-card">
                <div className="hero-card-header">
                  <span className="hero-card-merchant">{t.hero.cardMerchant}</span>
                  <div className="hero-card-tier">★ {t.tiers.items[2].name}</div>
                </div>
                <div className="hero-card-pts">12,400</div>
                <div className="hero-card-pts-label">{t.hero.globalPoints}</div>
                <div className="hero-card-meta">
                  <span>2,600 {t.hero.cardToTier}</span>
                  <span>48%</span>
                </div>
                <div className="hero-card-progress-bar">
                  {/* Animated via CSS progress-grow keyframe */}
                  <div className="hero-card-progress-fill" />
                </div>
              </div>

              {/* Floating mini-cards — animated via CSS float-fade-in + float-up keyframes */}
              <div className="hero-float-row">
                <div className="hero-float-card hero-float-earn">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t.hero.floatEarned}
                </div>
                <div className="hero-float-card hero-float-redeem">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d={redeemArrow}
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
          </div>
        </div>
      </div>
    </section>
  );
}
