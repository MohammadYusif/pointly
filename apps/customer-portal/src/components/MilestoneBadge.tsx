'use client';

import type { Badge } from '@/hooks/use-badges';
import { useTranslation } from '@pointly/i18n';
import { cn } from '@pointly/ui';
import { Award, Crown, Gem, Hash, ShoppingBag, TrendingUp, Users } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  Hash,
  Users,
  Award,
  Crown,
  Gem,
  TrendingUp,
};

interface MilestoneBadgeProps {
  badge: Badge;
}

export function MilestoneBadge({ badge }: MilestoneBadgeProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[badge.icon] ?? Award;

  const hasProgress = badge.progressMax != null && badge.progress != null && !badge.isEarned;
  const progressPercent =
    hasProgress && badge.progress != null && badge.progressMax
      ? (badge.progress / badge.progressMax) * 100
      : 0;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all',
        badge.isEarned
          ? 'bg-primary/5 border border-primary/20'
          : 'bg-muted/50 border border-transparent opacity-60',
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          badge.isEarned
            ? 'bg-primary/10 text-primary-accessible'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p
        className={cn(
          'text-xs font-semibold',
          badge.isEarned ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {t(badge.nameKey)}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight">{t(badge.descKey)}</p>
      {hasProgress && (
        <div className="w-full mt-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {badge.progress} / {badge.progressMax}
          </p>
        </div>
      )}
    </div>
  );
}
