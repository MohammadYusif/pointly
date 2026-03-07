'use client';

import { useTranslation } from '@pointly/i18n';
import { useRTL } from '@pointly/ui';
import { PointlyLogo } from './PointlyLogo';

export function LoginHero() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  return (
    <div className={`login-hero ${textStart}`}>
      <div className="mb-8">
        <PointlyLogo height={30} color="#ffffff" />
      </div>

      <div className="login-badge">
        <span className="login-badge-dot" />
        {t('auth.platformBadge')}
      </div>

      <h1 className="login-headline">
        {t('auth.heroLine1')}
        <br />
        <span className="login-headline-accent">{t('auth.heroLine2')}</span>
      </h1>

      <p className="login-hero-sub">{t('auth.heroSubtitle')}</p>

      <div className="login-stats">
        <div>
          <span className="login-stat-value">50+</span>
          <span className="login-stat-label">{t('auth.stats.merchantsLabel')}</span>
        </div>
        <div>
          <span className="login-stat-value">4</span>
          <span className="login-stat-label">{t('auth.stats.tiersLabel')}</span>
        </div>
        <div>
          <span className="login-stat-value">12K+</span>
          <span className="login-stat-label">{t('auth.stats.customersLabel')}</span>
        </div>
      </div>
    </div>
  );
}
