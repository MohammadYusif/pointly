import type { TranslationKeys } from '@/i18n/translations';

interface HeroProps {
  t: TranslationKeys;
}

export function Hero({ t }: HeroProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          {t.hero.badge}
        </div>

        <h1 className="hero-title">
          {t.hero.title} <span className="highlight">{t.hero.titleHighlight}</span>
        </h1>

        <p className="hero-sub">{t.hero.subtitle}</p>

        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={() => scrollTo('pricing')}>
            {t.hero.cta}
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
          <button type="button" className="btn-secondary" onClick={() => scrollTo('features')}>
            {t.hero.secondary}
          </button>
        </div>

        {/* Card mockup */}
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-card-merchant">Al-Noor Coffee</span>
              <div className="hero-card-tier">★ Gold</div>
            </div>
            <div className="hero-card-pts">12,400</div>
            <div className="hero-card-pts-label">global points</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}
            >
              <span>3,800 to Platinum</span>
              <span>62%</span>
            </div>
            <div className="hero-card-progress-bar">
              <div className="hero-card-progress-fill" />
            </div>
          </div>

          {/* Floating mini-cards */}
          <div className="hero-float-card hero-float-earn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            +240 pts earned
          </div>
          <div className="hero-float-card hero-float-redeem">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            −500 pts redeemed
          </div>
        </div>
      </div>
    </section>
  );
}
