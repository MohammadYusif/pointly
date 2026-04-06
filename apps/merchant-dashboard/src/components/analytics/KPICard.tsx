'use client';

import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { EASE } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import { motion, useReducedMotion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string;
  rawValue?: number;
  format?: (n: number) => string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  rawValue,
  format,
  icon,
  loading,
  className,
}: KPICardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
          <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
          {icon && <div className="h-4 w-4 text-muted-foreground shrink-0">{icon}</div>}
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="text-lg md:text-2xl font-bold truncate">
            {rawValue !== undefined && format !== undefined ? (
              <AnimatedNumber value={rawValue} format={format} loading={loading} />
            ) : loading ? (
              '...'
            ) : (
              value
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
