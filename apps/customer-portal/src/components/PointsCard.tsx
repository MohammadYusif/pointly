'use client';

import { useTranslation } from '@pointly/i18n';
import { Card, CardContent } from '@pointly/ui';

interface PointsCardProps {
  value: number;
  label: string;
  sublabel?: string;
  variant?: 'primary' | 'default';
}

export function PointsCard({ value, label, sublabel, variant = 'default' }: PointsCardProps) {
  const { formatNumber } = useTranslation();

  return (
    <Card className="points-card stagger-item">
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${variant === 'primary' ? 'text-primary' : ''}`}>
          {formatNumber(value)}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
