'use client';

import { useTranslation } from '@pointly/i18n';
import { Card, CardContent } from '@pointly/ui';

interface ChallengeCardProps {
  title: string;
  description: string;
  current: number;
  target: number;
  bonusPoints: number;
  daysRemaining: number;
}

export function ChallengeCard({
  title,
  description,
  current,
  target,
  bonusPoints,
  daysRemaining,
}: ChallengeCardProps) {
  const { t } = useTranslation();
  const isComplete = current >= target;

  return (
    <Card className="stagger-item">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <span className="text-xs font-medium text-primary whitespace-nowrap">
            +{bonusPoints} {t('common.points')}
          </span>
        </div>

        {/* Segmented progress dots */}
        <div className="flex gap-2">
          {Array.from({ length: target }, (_, n) => n + 1).map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-colors ${
                step <= current ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {isComplete ? t('challenges.completed') : `${current} / ${target}`}
          </span>
          {!isComplete && <span className="text-muted-foreground">{daysRemaining}d</span>}
        </div>
      </CardContent>
    </Card>
  );
}
