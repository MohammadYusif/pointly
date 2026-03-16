import { ulid } from 'ulid';
import { ValidationError } from '../errors/DomainError';
import type { PerkType } from './Merchant';

export type CampaignType =
  | 'DOUBLE_POINTS'
  | 'TRIPLE_POINTS'
  | 'BIRTHDAY_REWARD'
  | 'WIN_BACK'
  | 'WELCOME'
  | 'HAPPY_HOUR'
  | 'CUSTOM';

export interface CampaignDefaults {
  name: string;
  description: string;
  durationDays: number;
  multiplier: number;
  perkType: PerkType;
}

export const CAMPAIGN_DEFAULTS: Record<Exclude<CampaignType, 'CUSTOM'>, CampaignDefaults> = {
  DOUBLE_POINTS: {
    name: 'Double Points',
    description: 'Earn 2x points on all purchases',
    durationDays: 7,
    multiplier: 2,
    perkType: 'SPEND_BONUS',
  },
  TRIPLE_POINTS: {
    name: 'Triple Points',
    description: 'Earn 3x points on all purchases',
    durationDays: 3,
    multiplier: 3,
    perkType: 'SPEND_BONUS',
  },
  BIRTHDAY_REWARD: {
    name: 'Birthday Special',
    description: 'Celebrate your birthday with bonus points',
    durationDays: 30,
    multiplier: 2,
    perkType: 'BIRTHDAY_REWARD',
  },
  WIN_BACK: {
    name: 'We Miss You',
    description: 'Come back and earn bonus points',
    durationDays: 14,
    multiplier: 3,
    perkType: 'WIN_BACK',
  },
  WELCOME: {
    name: 'Welcome Bonus',
    description: 'Welcome! Earn bonus points on your first purchases',
    durationDays: 7,
    multiplier: 2,
    perkType: 'WELCOME_OFFER',
  },
  HAPPY_HOUR: {
    name: 'Happy Hour',
    description: 'Limited-time bonus points',
    durationDays: 1,
    multiplier: 2,
    perkType: 'HAPPY_HOUR',
  },
};

export interface CampaignEligibilityContext {
  dateOfBirth?: string;
  enrolledAt: Date;
  lastTransactionAt?: Date;
  customerTier: string;
}

export interface CampaignProps {
  campaignId: string;
  merchantId: string;
  type: CampaignType;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
  isActive: boolean;
  message?: string;
  linkedPerkId?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
  termsMessage?: string;
  createdAt: Date;
}

export interface CampaignJSON {
  campaignId: string;
  merchantId: string;
  type: CampaignType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  isActive: boolean;
  message?: string;
  linkedPerkId?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
  termsMessage?: string;
  createdAt: string;
}

interface CampaignOverrides {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  multiplier?: number;
  message?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
}

export class Campaign {
  private constructor(private props: CampaignProps) {}

  static create(merchantId: string, type: CampaignType, overrides?: CampaignOverrides): Campaign {
    const now = new Date();
    const resolved =
      type === 'CUSTOM'
        ? Campaign.resolveCustom(overrides)
        : Campaign.resolveTyped(type, overrides, now);

    Campaign.validateDates(resolved.startDate, resolved.endDate);
    Campaign.validateMultiplier(resolved.multiplier);

    const props: CampaignProps = {
      campaignId: ulid(),
      merchantId,
      type,
      ...resolved,
      isActive: true,
      createdAt: now,
    };
    if (overrides?.message) {
      props.message = overrides.message;
    }
    if (overrides?.targetTiers && overrides.targetTiers.length > 0) {
      props.targetTiers = overrides.targetTiers;
    }
    if (overrides?.maxUsesPerCustomer && overrides.maxUsesPerCustomer > 0) {
      props.maxUsesPerCustomer = overrides.maxUsesPerCustomer;
    }
    if (overrides?.minPurchaseAmount && overrides.minPurchaseAmount > 0) {
      props.minPurchaseAmount = overrides.minPurchaseAmount;
    }
    if (overrides?.maxPointsPerTransaction && overrides.maxPointsPerTransaction > 0) {
      props.maxPointsPerTransaction = overrides.maxPointsPerTransaction;
    }
    return new Campaign(props);
  }

  private static resolveCustom(overrides?: CampaignOverrides) {
    if (!overrides?.name || overrides.name.trim().length === 0) {
      throw new ValidationError('Campaign name is required for custom campaigns');
    }
    if (!overrides.startDate || !overrides.endDate) {
      throw new ValidationError('Start and end dates are required for custom campaigns');
    }
    return {
      name: overrides.name.trim(),
      description: overrides.description?.trim() ?? '',
      startDate: overrides.startDate,
      endDate: overrides.endDate,
      multiplier: overrides.multiplier ?? 2,
    };
  }

  private static resolveTyped(
    type: Exclude<CampaignType, 'CUSTOM'>,
    overrides: CampaignOverrides | undefined,
    now: Date,
  ) {
    const defaults = CAMPAIGN_DEFAULTS[type];
    return {
      name: overrides?.name?.trim() || defaults.name,
      description: overrides?.description?.trim() || defaults.description,
      startDate: overrides?.startDate ?? now,
      endDate:
        overrides?.endDate ?? new Date(now.getTime() + defaults.durationDays * 24 * 60 * 60 * 1000),
      multiplier: overrides?.multiplier ?? defaults.multiplier,
    };
  }

  private static validateDates(startDate: Date, endDate: Date) {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }
  }

  private static validateMultiplier(multiplier: number) {
    if (multiplier < 1.0 || multiplier > 5.0) {
      throw new ValidationError('Multiplier must be between 1.0 and 5.0');
    }
  }

  static reconstitute(props: CampaignProps): Campaign {
    return new Campaign(props);
  }

  // Getters
  getCampaignId(): string {
    return this.props.campaignId;
  }

  getMerchantId(): string {
    return this.props.merchantId;
  }

  getType(): CampaignType {
    return this.props.type;
  }

  getName(): string {
    return this.props.name;
  }

  getDescription(): string {
    return this.props.description;
  }

  getStartDate(): Date {
    return this.props.startDate;
  }

  getEndDate(): Date {
    return this.props.endDate;
  }

  getMultiplier(): number {
    return this.props.multiplier;
  }

  getIsActive(): boolean {
    return this.props.isActive;
  }

  getMessage(): string | undefined {
    return this.props.message;
  }

  getLinkedPerkId(): string | undefined {
    return this.props.linkedPerkId;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getTargetTiers(): string[] | undefined {
    return this.props.targetTiers;
  }

  getMaxUsesPerCustomer(): number | undefined {
    return this.props.maxUsesPerCustomer;
  }

  getMinPurchaseAmount(): number | undefined {
    return this.props.minPurchaseAmount;
  }

  getMaxPointsPerTransaction(): number | undefined {
    return this.props.maxPointsPerTransaction;
  }

  // Campaign limit checks
  isWithinUsageLimit(usageCount: number): boolean {
    const max = this.props.maxUsesPerCustomer;
    if (!max || max <= 0) return true;
    return usageCount < max;
  }

  meetsMinPurchase(amountSAR: number): boolean {
    const min = this.props.minPurchaseAmount;
    if (!min || min <= 0) return true;
    return amountSAR >= min;
  }

  capBonusPoints(bonusPoints: number): number {
    const max = this.props.maxPointsPerTransaction;
    if (!max || max <= 0) return bonusPoints;
    return Math.min(bonusPoints, max);
  }

  // Eligibility
  isEligibleForCustomer(ctx: CampaignEligibilityContext): boolean {
    if (!this.passesTierCheck(ctx.customerTier)) return false;
    return this.passesTypeCheck(ctx);
  }

  private passesTierCheck(customerTier: string): boolean {
    const tiers = this.props.targetTiers;
    if (!tiers || tiers.length === 0) return true;
    return tiers.includes(customerTier);
  }

  private passesTypeCheck(ctx: CampaignEligibilityContext): boolean {
    switch (this.props.type) {
      case 'BIRTHDAY_REWARD':
        return this.isBirthdayEligible(ctx.dateOfBirth);
      case 'WIN_BACK':
        return this.isWinBackEligible(ctx.lastTransactionAt);
      case 'WELCOME':
        return this.isWelcomeEligible(ctx.enrolledAt);
      default:
        return true;
    }
  }

  private isBirthdayEligible(dateOfBirth?: string): boolean {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    const dobMonth = dob.getMonth();
    const dobDay = dob.getDate();

    // Normalize to date-only (strip time) for fair comparison
    const startDate = new Date(
      this.props.startDate.getFullYear(),
      this.props.startDate.getMonth(),
      this.props.startDate.getDate(),
    );
    const endDate = new Date(
      this.props.endDate.getFullYear(),
      this.props.endDate.getMonth(),
      this.props.endDate.getDate(),
    );

    // Check if the customer's birthday (month+day) falls within the campaign date range
    for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
      const birthdayThisYear = new Date(year, dobMonth, dobDay);
      if (birthdayThisYear >= startDate && birthdayThisYear <= endDate) {
        return true;
      }
    }
    return false;
  }

  private isWinBackEligible(lastTransactionAt?: Date): boolean {
    if (!lastTransactionAt) return true;
    const msIn60Days = 60 * 24 * 60 * 60 * 1000;
    return Date.now() - lastTransactionAt.getTime() >= msIn60Days;
  }

  private isWelcomeEligible(enrolledAt: Date): boolean {
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - enrolledAt.getTime() <= msIn30Days;
  }

  getTermsMessage(): string | undefined {
    return this.props.termsMessage;
  }

  /**
   * Auto-generate a terms message from campaign properties.
   * Merchant can override this with a custom message.
   */
  generateTermsMessage(): string {
    const parts: string[] = [];

    parts.push(`Earn ${this.props.multiplier}x points on your purchases`);

    if (this.props.minPurchaseAmount && this.props.minPurchaseAmount > 0) {
      parts.push(`Minimum purchase: ${this.props.minPurchaseAmount} SAR`);
    }

    if (this.props.maxUsesPerCustomer && this.props.maxUsesPerCustomer > 0) {
      parts.push(
        `Limited to ${this.props.maxUsesPerCustomer} ${this.props.maxUsesPerCustomer === 1 ? 'use' : 'uses'} per customer`,
      );
    }

    if (this.props.maxPointsPerTransaction && this.props.maxPointsPerTransaction > 0) {
      parts.push(`Maximum ${this.props.maxPointsPerTransaction} bonus points per transaction`);
    }

    const endStr = this.props.endDate.toLocaleDateString('en-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    parts.push(`Valid until ${endStr}`);

    return `${parts.join('. ')}.`;
  }

  setTermsMessage(message: string): void {
    this.props.termsMessage = message;
  }

  // Mutations
  setLinkedPerkId(id: string): void {
    this.props.linkedPerkId = id;
  }

  // Business logic
  isActiveNow(): boolean {
    if (!this.props.isActive) return false;
    const now = new Date();
    return now >= this.props.startDate && now <= this.props.endDate;
  }

  isExpired(): boolean {
    return new Date() > this.props.endDate;
  }

  isScheduled(): boolean {
    return this.props.isActive && new Date() < this.props.startDate;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  // Serialization
  toJSON(): CampaignJSON {
    const result: CampaignJSON = {
      campaignId: this.props.campaignId,
      merchantId: this.props.merchantId,
      type: this.props.type,
      name: this.props.name,
      description: this.props.description,
      startDate: this.props.startDate.toISOString(),
      endDate: this.props.endDate.toISOString(),
      multiplier: this.props.multiplier,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
    };
    if (this.props.message) result.message = this.props.message;
    if (this.props.linkedPerkId) result.linkedPerkId = this.props.linkedPerkId;
    if (this.props.targetTiers && this.props.targetTiers.length > 0) {
      result.targetTiers = this.props.targetTiers;
    }
    if (this.props.maxUsesPerCustomer && this.props.maxUsesPerCustomer > 0) {
      result.maxUsesPerCustomer = this.props.maxUsesPerCustomer;
    }
    if (this.props.minPurchaseAmount && this.props.minPurchaseAmount > 0) {
      result.minPurchaseAmount = this.props.minPurchaseAmount;
    }
    if (this.props.maxPointsPerTransaction && this.props.maxPointsPerTransaction > 0) {
      result.maxPointsPerTransaction = this.props.maxPointsPerTransaction;
    }
    if (this.props.termsMessage) {
      result.termsMessage = this.props.termsMessage;
    }
    return result;
  }
}
