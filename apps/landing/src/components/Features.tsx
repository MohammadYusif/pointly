'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { ArrowLeftRight, BarChart3, Flame, Gift, Layers, Zap } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface FeaturesProps {
  t: TranslationKeys;
}

const ICONS = [Zap, Layers, ArrowLeftRight, Gift, BarChart3, Flame];

export function Features({ t }: FeaturesProps) {
  return (
    <section className="section" id="features">
      <div className="container">
        <ScrollReveal>
          <div className="section-label">{t.features.label}</div>
          <h2 className="section-title">{t.features.title}</h2>
          <p className="section-sub">{t.features.subtitle}</p>
        </ScrollReveal>

        <div className="features-grid">
          {t.features.items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <ScrollReveal key={item.title} delay={i + 1}>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="feature-title">{item.title}</div>
                  <div className="feature-desc">{item.desc}</div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
