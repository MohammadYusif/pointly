'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { fadeLeft, fadeRight, smooth, viewportOnce } from '@/lib/motion';
import { motion } from 'framer-motion';

interface NetworkSectionProps {
  t: TranslationKeys;
}

function MerchantIcon({ index }: { index: number }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#08b0a2',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (index === 0) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" x2="8.12" y1="4" y2="15.88" />
        <line x1="14.47" x2="20" y1="14.48" y2="20" />
        <line x1="8.12" x2="12" y1="8.12" y2="12" />
      </svg>
    );
  }

  if (index === 3) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }

  if (index === 4) {
    return (
      <svg {...common} aria-hidden="true">
        <line x1="6.5" x2="17.5" y1="12" y2="12" />
        <line x1="6" x2="6" y1="9" y2="15" />
        <line x1="3" x2="3" y1="10" y2="14" />
        <line x1="18" x2="18" y1="9" y2="15" />
        <line x1="21" x2="21" y1="10" y2="14" />
      </svg>
    );
  }

  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

export function NetworkSection({ t }: NetworkSectionProps) {
  const points = [t.network.pointOne, t.network.pointTwo, t.network.pointThree];

  return (
    <section className="network-section" id="network">
      <div className="container">
        <div className="network-layout">
          {/* Graphic */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            transition={smooth}
          >
            <div className="network-graphic">
              {/* Connecting lines */}
              <svg className="network-lines" viewBox="0 0 420 420" fill="none" aria-hidden="true">
                <line
                  x1="210"
                  y1="210"
                  x2="210"
                  y2="30"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="210"
                  y1="210"
                  x2="380"
                  y2="115"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="210"
                  y1="210"
                  x2="380"
                  y2="305"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="210"
                  y1="210"
                  x2="210"
                  y2="390"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="210"
                  y1="210"
                  x2="40"
                  y2="305"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="210"
                  y1="210"
                  x2="40"
                  y2="115"
                  stroke="rgba(8,176,162,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Hub */}
              <div className="network-hub">Pointly</div>

              {/* Merchant nodes */}
              {t.network.merchants.map((label, i) => (
                <div key={label} className="network-node" title={label}>
                  <MerchantIcon index={i} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            transition={{ ...smooth, delay: 0.2 }}
          >
            <div className="section-label">{t.network.label}</div>
            <h2 className="section-title">{t.network.title}</h2>
            <p className="section-sub mb-8">{t.network.subtitle}</p>

            <div className="flex flex-col gap-4">
              {points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-px">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="#08b0a2"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-[0.95rem] text-text-secondary">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
