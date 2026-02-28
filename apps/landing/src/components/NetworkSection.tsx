import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface NetworkSectionProps {
  t: TranslationKeys;
}

export function NetworkSection({ t }: NetworkSectionProps) {
  const points = [t.network.pointOne, t.network.pointTwo, t.network.pointThree];

  return (
    <section className="network-section" id="network">
      <div className="container">
        <div className="network-layout">
          {/* Graphic */}
          <ScrollReveal>
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
              {t.network.merchants.map((label) => (
                <div key={label} className="network-node" title={label}>
                  <span className="text-[1.2rem]">{label.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Text */}
          <ScrollReveal delay={1}>
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
                  <span className="text-[0.95rem] text-text-secondary leading-[1.5]">{point}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
