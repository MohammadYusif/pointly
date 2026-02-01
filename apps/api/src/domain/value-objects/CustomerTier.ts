import { ValidationError } from '../errors/DomainError';

export enum CustomerTierLevel {
  BRONZE = 'BRONZE',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface TierThresholds {
  readonly monthlyMinimum: number;
  readonly earningMultiplier: number;
  readonly decays: boolean;
  readonly displayName: string;
  readonly color: string;
}

export class CustomerTier {
  private static readonly TIER_CONFIG: Record<CustomerTierLevel, TierThresholds> = {
    [CustomerTierLevel.BRONZE]: {
      monthlyMinimum: 0,
      earningMultiplier: 1.0,
      decays: true,
      displayName: 'Bronze',
      color: '#CD7F32',
    },
    [CustomerTierLevel.PLATINUM]: {
      monthlyMinimum: 5000,
      earningMultiplier: 1.1,
      decays: false,
      displayName: 'Platinum',
      color: '#E5E4E2',
    },
    [CustomerTierLevel.DIAMOND]: {
      monthlyMinimum: 15000,
      earningMultiplier: 1.2,
      decays: false,
      displayName: 'Diamond',
      color: '#B9F2FF',
    },
  };

  constructor(private readonly level: CustomerTierLevel) {}

  // Factory methods
  static fromLevel(level: CustomerTierLevel): CustomerTier {
    return new CustomerTier(level);
  }

  static bronze(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.BRONZE);
  }

  static platinum(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.PLATINUM);
  }

  static diamond(): CustomerTier {
    return new CustomerTier(CustomerTierLevel.DIAMOND);
  }

  // Calculate tier based on monthly progress
  static fromMonthlyProgress(monthlyPoints: number): CustomerTier {
    if (monthlyPoints < 0) {
      throw new ValidationError('Monthly points cannot be negative');
    }
    if (monthlyPoints >= 15000) {
      return CustomerTier.diamond();
    }
    if (monthlyPoints >= 5000) {
      return CustomerTier.platinum();
    }
    return CustomerTier.bronze();
  }

  // Getters
  getLevel(): CustomerTierLevel {
    return this.level;
  }

  getThresholds(): TierThresholds {
    return CustomerTier.TIER_CONFIG[this.level];
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
    const order = [CustomerTierLevel.BRONZE, CustomerTierLevel.PLATINUM, CustomerTierLevel.DIAMOND];
    return order.indexOf(this.level) > order.indexOf(other.level);
  }

  isLowerThan(other: CustomerTier): boolean {
    const order = [CustomerTierLevel.BRONZE, CustomerTierLevel.PLATINUM, CustomerTierLevel.DIAMOND];
    return order.indexOf(this.level) < order.indexOf(other.level);
  }

  // Qualification check
  meetsQualification(monthlyPoints: number): boolean {
    return monthlyPoints >= this.getMonthlyMinimum();
  }

  // Calculate tier decay (one level down)
  decay(): CustomerTier {
    if (this.level === CustomerTierLevel.DIAMOND) {
      return CustomerTier.platinum();
    }
    if (this.level === CustomerTierLevel.PLATINUM) {
      return CustomerTier.bronze();
    }
    return this; // Bronze can't go lower
  }

  // Serialization
  toString(): string {
    return this.level;
  }

  toJSON(): string {
    return this.level;
  }
}
