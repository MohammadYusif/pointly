'use client';

import type { TranslationKeys } from '@/i18n/translations';
import { Globe, Landmark, Smartphone } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface AboutSectionProps {
  t: TranslationKeys;
}

const VALUE_ICONS = [Landmark, Smartphone, Globe];

export function AboutSection({ t }: AboutSectionProps) {
  return (
    <section className="section about-section" id="about">
      <div className="container">
        <div className="about-layout">
          {/* Text */}
          <ScrollReveal>
            <div className="section-label">{t.about.label}</div>
            <h2 className="section-title">{t.about.title}</h2>
            <p className="section-sub">{t.about.subtitle}</p>

            <div className="about-values">
              {t.about.values.map((value, i) => {
                const Icon = VALUE_ICONS[i];
                return (
                  <div key={value.title} className="about-value">
                    <div className="about-value-icon">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="about-value-title">{value.title}</div>
                      <div className="about-value-desc">{value.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* 2x2 stat cards */}
          <ScrollReveal delay={2}>
            <div className="about-stats">
              {t.about.stats.map((stat) => (
                <div key={stat.label} className="about-stat-card">
                  <div className="about-stat-value">{stat.value}</div>
                  <div className="about-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
