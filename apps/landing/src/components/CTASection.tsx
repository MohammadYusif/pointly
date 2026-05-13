'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { scaleIn, viewportOnce } from '@/lib/motion';
import { motion } from 'framer-motion';

interface CTASectionProps {
  t: TranslationKeys;
  isRtl: boolean;
}

export function CTASection({ t, isRtl }: CTASectionProps) {
  const arrowPath = isRtl ? 'M13 8H3M7 4l-4 4 4 4' : 'M3 8h10M9 4l4 4-4 4';

  return (
    <section className="cta-section">
      <div className="container">
        <motion.div
          className="cta-box"
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cta-inner">
            <div className="section-label">{t.cta.label}</div>
            <h2 className="section-title">{t.cta.title}</h2>
            <p className="section-sub">{t.cta.subtitle}</p>

            <div className="cta-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {t.cta.primary}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d={arrowPath}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="cta-note">{t.cta.note}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
