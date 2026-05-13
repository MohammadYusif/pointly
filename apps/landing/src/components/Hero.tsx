'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { fadeUp, smooth, spring } from '@/lib/motion';
import { motion } from 'framer-motion';

interface HeroProps {
  t: TranslationKeys;
  isRtl: boolean;
}

const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const cardEntrance = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const floatEntrance = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

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
          {/* Left: text */}
          <motion.div
            className="hero-text"
            variants={heroContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 className="hero-title" variants={fadeUp} transition={smooth}>
              {t.hero.title} <span className="highlight">{t.hero.titleHighlight}</span>
            </motion.h1>

            <motion.p className="hero-sub" variants={fadeUp} transition={smooth}>
              {t.hero.subtitle}
            </motion.p>

            <motion.div className="hero-actions" variants={fadeUp} transition={smooth}>
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
          <motion.div
            className="hero-visual"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { delayChildren: 0.5 } } }}
          >
            <motion.div className="hero-card-wrap" variants={cardEntrance} transition={spring}>
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
                  <motion.div
                    className="hero-card-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: '48%' }}
                    transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              {/* Floating mini-cards */}
              <motion.div
                className="hero-float-row"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
                }}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  className="hero-float-card hero-float-earn"
                  variants={floatEntrance}
                  transition={spring}
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
                  variants={floatEntrance}
                  transition={spring}
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
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
