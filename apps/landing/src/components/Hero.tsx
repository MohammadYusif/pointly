'use client';

import type { TranslationKeys } from '@/i18n/translations';
import type { BezierDefinition, Variants } from 'framer-motion';
import { motion, useReducedMotion } from 'framer-motion';

interface HeroProps {
  t: TranslationKeys;
  isRtl: boolean;
}

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE, delay: 0.3 },
  },
};

const floatCardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE, delay: 0.6 + i * 0.15 },
  }),
};

export function Hero({ t, isRtl }: HeroProps) {
  const prefersReducedMotion = useReducedMotion();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ctaArrow = isRtl ? 'M13 8H3M7 4l-4 4 4 4' : 'M3 8h10M9 4l4 4-4 4';
  const redeemArrow = isRtl ? 'M12 7H2M6 3l-4 4 4 4' : 'M2 7h10M8 3l4 4-4 4';

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          {/* Left: text */}
          <motion.div
            className="hero-text"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="hero-badge" variants={itemVariants}>
              <span className="hero-badge-dot" />
              {t.hero.badge}
            </motion.div>

            <motion.h1 className="hero-title" variants={itemVariants}>
              {t.hero.title} <span className="highlight">{t.hero.titleHighlight}</span>
            </motion.h1>

            <motion.p className="hero-sub" variants={itemVariants}>
              {t.hero.subtitle}
            </motion.p>

            <motion.div className="hero-actions" variants={itemVariants}>
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
            </motion.div>
          </motion.div>

          {/* Right: card mockup */}
          <div className="hero-visual">
            <div className="hero-card-wrap">
              <motion.div
                className="hero-card"
                variants={prefersReducedMotion ? undefined : cardVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="hero-card-header">
                  <span className="hero-card-merchant">{t.hero.cardMerchant}</span>
                  <div className="hero-card-tier">★ {t.tiers.items[2].name}</div>
                </div>
                <div className="hero-card-pts">12,400</div>
                <div className="hero-card-pts-label">{t.hero.globalPoints}</div>
                <div className="hero-card-meta">
                  <span>2,600 {t.hero.cardToTier}</span>
                  <span>62%</span>
                </div>
                <div className="hero-card-progress-bar">
                  <motion.div
                    className="hero-card-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: '62%' }}
                    transition={{ duration: 1.2, ease: EASE, delay: 0.8 }}
                  />
                </div>
              </motion.div>

              {/* Floating mini-cards */}
              <div className="hero-float-row">
                <motion.div
                  className="hero-float-card hero-float-earn"
                  custom={0}
                  variants={prefersReducedMotion ? undefined : floatCardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t.hero.floatEarned}
                </motion.div>
                <motion.div
                  className="hero-float-card hero-float-redeem"
                  custom={1}
                  variants={prefersReducedMotion ? undefined : floatCardVariants}
                  initial="hidden"
                  animate="visible"
                >
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
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
