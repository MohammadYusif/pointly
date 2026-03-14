'use client';

import { useTranslation } from '@pointly/i18n';
import { Card, CardContent } from '@pointly/ui';
import { type BezierDefinition, motion, useReducedMotion } from 'framer-motion';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

interface PointsCardProps {
  value: number;
  label: string;
  sublabel?: string;
  variant?: 'primary' | 'default';
  icon?: React.ReactNode;
}

export function PointsCard({ value, label, sublabel, variant = 'default', icon }: PointsCardProps) {
  const { formatNumber } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Card className="points-card">
        <CardContent className="p-4 text-center space-y-1">
          {icon && <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>}
          <p className={`text-2xl font-bold ${variant === 'primary' ? 'text-primary' : ''}`}>
            {formatNumber(value)}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
