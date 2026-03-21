/**
 * Centralized Customer Tier Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all tier-related settings.
 * To add/remove/modify tiers, update ONLY this file — all domain logic,
 * repositories, use-cases, and frontends derive from these values.
 */

export enum CustomerTierLevel {
  BRONZE = 'BRONZE',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface TierBenefit {
  readonly key: string; // i18n key suffix, e.g. 'earningMultiplier'
  readonly icon: string; // emoji icon for display
}

export interface TierThresholds {
  readonly monthlyMinimum: number;
  readonly earningMultiplier: number;
  readonly decays: boolean;
  readonly displayName: string;
  readonly color: string;
  readonly benefits: readonly TierBenefit[];
}

/**
 * Tier definitions ordered from LOWEST to HIGHEST.
 * The order of entries here determines tier ranking for upgrades/downgrades.
 */
export const TIER_ORDER: readonly CustomerTierLevel[] = [
  CustomerTierLevel.BRONZE,
  CustomerTierLevel.GOLD,
  CustomerTierLevel.PLATINUM,
  CustomerTierLevel.DIAMOND,
] as const;

export const TIER_CONFIG: Record<CustomerTierLevel, TierThresholds> = {
  [CustomerTierLevel.BRONZE]: {
    monthlyMinimum: 0,
    earningMultiplier: 1.0,
    decays: true,
    displayName: 'Bronze',
    color: '#CD7F32',
    benefits: [
      { key: 'earnPoints', icon: '⭐' },
      { key: 'merchantPerks', icon: '🎁' },
      { key: 'weeklyStreak500', icon: '🔥' },
    ],
  },
  [CustomerTierLevel.GOLD]: {
    monthlyMinimum: 5000,
    earningMultiplier: 1.1,
    decays: false,
    displayName: 'Gold',
    color: '#FFD700',
    benefits: [
      { key: 'multiplier1_1x', icon: '✨' },
      { key: 'decayImmunity', icon: '🛡️' },
      { key: 'weeklyStreak550', icon: '🔥' },
      { key: 'priorityBadge', icon: '🥇' },
    ],
  },
  [CustomerTierLevel.PLATINUM]: {
    monthlyMinimum: 10000,
    earningMultiplier: 1.15,
    decays: false,
    displayName: 'Platinum',
    color: '#E5E4E2',
    benefits: [
      { key: 'multiplier1_15x', icon: '✨' },
      { key: 'decayImmunity', icon: '🛡️' },
      { key: 'weeklyStreak625', icon: '🔥' },
      { key: 'priorityBadge', icon: '🥇' },
      { key: 'exclusivePerks', icon: '💎' },
    ],
  },
  [CustomerTierLevel.DIAMOND]: {
    monthlyMinimum: 15000,
    earningMultiplier: 1.2,
    decays: false,
    displayName: 'Diamond',
    color: '#B9F2FF',
    benefits: [
      { key: 'multiplier1_2x', icon: '✨' },
      { key: 'decayImmunity', icon: '🛡️' },
      { key: 'weeklyStreak750', icon: '🔥' },
      { key: 'priorityBadge', icon: '🥇' },
      { key: 'exclusivePerks', icon: '💎' },
      { key: 'diamondStatus', icon: '👑' },
    ],
  },
};

/** All valid tier level strings (for repository validation) */
export const VALID_TIER_LEVELS: readonly string[] = TIER_ORDER.map((t) => t as string);

/** The lowest tier (default for new customers) */
export const DEFAULT_TIER = CustomerTierLevel.BRONZE;

/** The highest tier */
export const MAX_TIER = TIER_ORDER[TIER_ORDER.length - 1];
