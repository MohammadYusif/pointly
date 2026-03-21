/**
 * Shared Customer Tier Configuration for frontends
 *
 * This mirrors the backend domain config at:
 *   apps/api/src/domain/config/TierConfig.ts
 *
 * If you add/remove/modify tiers, update BOTH files.
 * Tiers are ordered from lowest to highest.
 */

export const CUSTOMER_TIERS = {
  BRONZE: {
    level: 'BRONZE',
    displayName: 'Bronze',
    monthlyMinimum: 0,
    earningMultiplier: 1.0,
    color: '#CD7F32',
    tailwindColor: 'text-amber-600',
  },
  GOLD: {
    level: 'GOLD',
    displayName: 'Gold',
    monthlyMinimum: 5000,
    earningMultiplier: 1.1,
    color: '#FFD700',
    tailwindColor: 'text-yellow-600',
  },
  PLATINUM: {
    level: 'PLATINUM',
    displayName: 'Platinum',
    monthlyMinimum: 10000,
    earningMultiplier: 1.15,
    color: '#E5E4E2',
    tailwindColor: 'text-gray-500',
  },
  DIAMOND: {
    level: 'DIAMOND',
    displayName: 'Diamond',
    monthlyMinimum: 15000,
    earningMultiplier: 1.2,
    color: '#B9F2FF',
    tailwindColor: 'text-purple-600',
  },
} as const;

/** Tier levels ordered from lowest to highest */
export const TIER_ORDER = ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] as const;

export type CustomerTierLevel = (typeof TIER_ORDER)[number];

/**
 * Get tier display color (Tailwind class) from tier level string.
 * Works with both enum values ('DIAMOND') and display names ('Diamond').
 */
export function getTierColor(tier: string): string {
  const upper = tier.toUpperCase();
  const found = CUSTOMER_TIERS[upper as keyof typeof CUSTOMER_TIERS];
  if (found) return found.tailwindColor;
  // Fallback: try matching by display name
  for (const t of Object.values(CUSTOMER_TIERS)) {
    if (t.displayName.toUpperCase() === upper) return t.tailwindColor;
  }
  return 'text-amber-600'; // Default to Bronze color
}

/**
 * Get background Tailwind class for a tier badge.
 */
export function getTierBgColor(tier: CustomerTierLevel): string {
  switch (tier) {
    case 'BRONZE':
      return 'bg-amber-500';
    case 'GOLD':
      return 'bg-yellow-500';
    case 'PLATINUM':
      return 'bg-blue-500';
    case 'DIAMOND':
      return 'bg-teal-400';
    default:
      return 'bg-amber-500';
  }
}

/**
 * Get points target for next tier from a given tier level.
 * Returns 0 if already at max tier.
 */
export function getTierTarget(tier: string): number {
  const upper = tier.toUpperCase();
  const idx = TIER_ORDER.indexOf(upper as CustomerTierLevel);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return 0;
  const nextTier = TIER_ORDER[idx + 1];
  return CUSTOMER_TIERS[nextTier].monthlyMinimum;
}
