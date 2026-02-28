import type { TranslationKeys } from '@/i18n/translations';
import { ScrollReveal } from './ScrollReveal';

interface StatsBarProps {
  t: TranslationKeys;
}

const STATS = [
  { value: '200+', key: 'merchants' as const },
  { value: '15K+', key: 'customers' as const },
  { value: '2M+', key: 'points' as const },
  { value: '12', key: 'cities' as const },
];

export function StatsBar({ t }: StatsBarProps) {
  return (
    <section className="stats-bar">
      <div className="container">
        <div className="stats-grid">
          {STATS.map((stat, i) => (
            <ScrollReveal key={stat.key} delay={(i % 4) as 0 | 1 | 2 | 3 | 4}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{t.stats[stat.key]}</div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
