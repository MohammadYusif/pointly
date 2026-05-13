'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { fadeUp, smooth, staggerContainer, viewportOnce } from '@/lib/motion';
import { motion } from 'framer-motion';

interface StatsBarProps {
  t: TranslationKeys;
}

const STATS = [
  { value: '3', key: 'merchants' as const },
  { value: '4', key: 'customers' as const },
  { value: '1:1', key: 'points' as const },
  { value: 'KSA', key: 'cities' as const },
];

export function StatsBar({ t }: StatsBarProps) {
  return (
    <section className="stats-bar">
      <div className="container">
        <motion.div
          className="stats-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {STATS.map((stat) => (
            <motion.div key={stat.key} className="stat-item" variants={fadeUp} transition={smooth}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{t.stats[stat.key]}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
