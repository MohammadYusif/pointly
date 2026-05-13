'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { fadeUp, smooth, staggerContainerSlow, viewportOnce } from '@/lib/motion';
import { motion } from 'framer-motion';
import { ArrowLeftRight, BarChart3, Flame, Layers, Send, Zap } from 'lucide-react';

interface FeaturesProps {
  t: TranslationKeys;
}

const ICONS = [Zap, Layers, ArrowLeftRight, Send, BarChart3, Flame];

export function Features({ t }: FeaturesProps) {
  return (
    <section className="section" id="features">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          transition={smooth}
        >
          <div className="section-label">{t.features.label}</div>
          <h2 className="section-title">{t.features.title}</h2>
          <p className="section-sub">{t.features.subtitle}</p>
        </motion.div>

        <motion.div
          className="features-grid"
          variants={staggerContainerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {t.features.items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: static array, index key prevents FM remount on locale switch
                key={i}
                variants={fadeUp}
                transition={smooth}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="feature-title">{item.title}</div>
                  <div className="feature-desc">{item.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
