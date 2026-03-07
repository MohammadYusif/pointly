'use client';

import { CUSTOMER_TIERS, getTierColor } from '@pointly/shared';
import { cn } from '@pointly/ui';

interface TierBadgeProps {
  tier: string;
  label: string;
  size?: 'sm' | 'md';
}

function getTierHex(tier: string): string {
  const upper = tier.toUpperCase();
  const found = CUSTOMER_TIERS[upper as keyof typeof CUSTOMER_TIERS];
  return found ? found.color : CUSTOMER_TIERS.BRONZE.color;
}

export function TierBadge({ tier, label, size = 'md' }: TierBadgeProps) {
  const tierColor = getTierColor(tier);
  const hexColor = getTierHex(tier);

  return (
    <span
      className={cn(
        'tier-badge',
        tierColor,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
      )}
      style={{
        borderColor: `${hexColor}40`,
        backgroundColor: `${hexColor}15`,
      }}
    >
      {label}
    </span>
  );
}
