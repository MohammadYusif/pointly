'use client';

import { CUSTOMER_TIERS } from '@pointly/shared';
import { type BezierDefinition, motion, useReducedMotion } from 'framer-motion';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  tier: string;
  children?: React.ReactNode;
}

function getTierHexColor(tier: string): string {
  const upper = tier.toUpperCase();
  const found = CUSTOMER_TIERS[upper as keyof typeof CUSTOMER_TIERS];
  if (found) return found.color;
  for (const t of Object.values(CUSTOMER_TIERS)) {
    if (t.displayName.toUpperCase() === upper) return t.color;
  }
  return CUSTOMER_TIERS.BRONZE.color;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  tier,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;
  const strokeColor = getTierHexColor(tier);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Tier progress"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </motion.div>
  );
}
