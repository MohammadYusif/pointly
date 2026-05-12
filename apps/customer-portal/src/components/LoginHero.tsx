'use client';

import { useTranslation } from '@pointly/i18n';
import { useRTL } from '@pointly/ui';
import { type BezierDefinition, type Variants, motion, useReducedMotion } from 'framer-motion';
import { PointlyLogo } from './PointlyLogo';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function LoginHero() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`login-hero ${textStart}`}
      variants={containerVariants}
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      animate="visible"
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <PointlyLogo height={30} color="#ffffff" />
      </motion.div>

      <motion.h1 className="login-headline" variants={itemVariants}>
        {t('auth.heroLine1')}
        <br />
        <span className="login-headline-accent">{t('auth.heroLine2')}</span>
      </motion.h1>

      <motion.p className="login-hero-sub" variants={itemVariants}>
        {t('auth.heroSubtitle')}
      </motion.p>
    </motion.div>
  );
}
