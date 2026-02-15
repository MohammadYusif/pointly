import {
  CustomerTierLevel,
  DEFAULT_TIER,
  MAX_TIER,
  TIER_CONFIG,
  TIER_ORDER,
  type TierThresholds,
} from '../config/TierConfig';

// Re-export so consumers can still import from here
export { CustomerTierLevel, type TierThresholds };

import { ValidationError } from '../errors/DomainError';

export class CustomerTier {
  constructor(private readonly level: CustomerTierLevel) {}

  // Factory methods
  static fromLevel(level: CustomerTierLevel): CustomerTier {
    return new CustomerTier(level);
  }

  static bronze(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.BRONZE);
  }

  static gold(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.GOLD);
  }

  static platinum(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.PLATINUM);
  }

  static diamond(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.DIAMOND);
  }

  /**
   * Calculate tier based on monthly progress.
   * Iterates tiers from highest to lowest and returns the first one the customer qualifies for.
   */
  static fromMonthlyProgress(monthlyPoints: number): CustomerTier {
    if (monthlyPoints < 0) {
      throw new ValidationError('Monthly points cannot be negative');
    }
    // Walk tiers from highest to lowest
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
      const tier = TIER_ORDER[i] as CustomerTierLevel;
      if (monthlyPoints >= TIER_CONFIG[tier].monthlyMinimum) {
        return new CustomerTier(tier);
      }
    }
    return new CustomerTier(DEFAULT_TIER);
  }

  // Getters
  getLevel(): CustomerTierLevel {
    return this.level;
  }

  getThresholds(): TierThresholds {
    return TIER_CONFIG[this.level];
  }

  getEarningMultiplier(): number {
    return this.getThresholds().earningMultiplier;
  }

  isDecayImmune(): boolean {
    return !this.getThresholds().decays;
  }

  getMonthlyMinimum(): number {
    return this.getThresholds().monthlyMinimum;
  }

  getDisplayName(): string {
    return this.getThresholds().displayName;
  }

  getColor(): string {
    return this.getThresholds().color;
  }

  // Comparison methods
  equals(other: CustomerTier): boolean {
    return this.level === other.level;
  }

  isHigherThan(other: CustomerTier): boolean {
    return TIER_ORDER.indexOf(this.level) > TIER_ORDER.indexOf(other.level);
  }

  isLowerThan(other: CustomerTier): boolean {
    return TIER_ORDER.indexOf(this.level) < TIER_ORDER.indexOf(other.level);
  }

  // Qualification check
  meetsQualification(monthlyPoints: number): boolean {
    return monthlyPoints >= this.getMonthlyMinimum();
  }

  /**
   * Calculate tier decay (one level down).
   * Uses TIER_ORDER so adding/removing tiers automatically adjusts decay paths.
   */
  decay(): CustomerTier {
    const idx = TIER_ORDER.indexOf(this.level);
    if (idx <= 0) return this; // Already at lowest tier
    return new CustomerTier(TIER_ORDER[idx - 1] as CustomerTierLevel);
  }

  /**
   * Get the next tier above this one (or null if already at max).
   */
  nextTier(): CustomerTier | null {
    const idx = TIER_ORDER.indexOf(this.level);
    if (idx >= TIER_ORDER.length - 1) return null;
    return new CustomerTier(TIER_ORDER[idx + 1] as CustomerTierLevel);
  }

  /**
   * Is this the highest possible tier?
   */
  isMaxTier(): boolean {
    return this.level === MAX_TIER;
  }

  // Serialization
  toString(): string {
    return this.level;
  }

  toJSON(): string {
    return this.level;
  }
}
