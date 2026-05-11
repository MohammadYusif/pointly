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
    durationDays: 365,
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

/** A single purchase line item used for category-targeted campaign matching. */
export interface LineItem {
  category: string;
  amountSAR: number;
}

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
  /** Days of inactivity required to qualify for a WIN_BACK campaign. Defaults to 60. */
  winBackDays?: number;
  /** Days since enrollment to qualify for a WELCOME campaign. Defaults to 30. */
  welcomeDays?: number;
  /** Generic inactivity filter — any campaign type. Customer must NOT have visited within this many days. */
  lastVisitDays?: number;
  /** Category filter — bonus only applies to line items whose category is in this list. */
  productCategories?: string[];
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
  winBackDays?: number;
  welcomeDays?: number;
  lastVisitDays?: number;
  productCategories?: string[];
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
  winBackDays?: number;
  welcomeDays?: number;
  lastVisitDays?: number;
  productCategories?: string[];
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
    if (overrides) Campaign.applyCreationOverrides(props, overrides);
    return new Campaign(props);
  }

  private static applyCreationOverrides(props: CampaignProps, overrides: CampaignOverrides): void {
    if (overrides.message) props.message = overrides.message;
    Campaign.applyCreationLimits(props, overrides);
    Campaign.applyCreationDays(props, overrides);
  }

  private static applyCreationLimits(props: CampaignProps, overrides: CampaignOverrides): void {
    if (overrides.targetTiers && overrides.targetTiers.length > 0)
      props.targetTiers = overrides.targetTiers;
    if (overrides.maxUsesPerCustomer && overrides.maxUsesPerCustomer > 0)
      props.maxUsesPerCustomer = overrides.maxUsesPerCustomer;
    if (overrides.minPurchaseAmount && overrides.minPurchaseAmount > 0)
      props.minPurchaseAmount = overrides.minPurchaseAmount;
    if (overrides.maxPointsPerTransaction && overrides.maxPointsPerTransaction > 0)
      props.maxPointsPerTransaction = overrides.maxPointsPerTransaction;
    if (overrides.productCategories && overrides.productCategories.length > 0)
      props.productCategories = overrides.productCategories;
  }

  private static applyCreationDays(props: CampaignProps, overrides: CampaignOverrides): void {
    if (overrides.winBackDays && overrides.winBackDays > 0)
      props.winBackDays = overrides.winBackDays;
    if (overrides.welcomeDays && overrides.welcomeDays > 0)
      props.welcomeDays = overrides.welcomeDays;
    if (overrides.lastVisitDays && overrides.lastVisitDays > 0)
      props.lastVisitDays = overrides.lastVisitDays;
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

  getWinBackDays(): number | undefined {
    return this.props.winBackDays;
  }

  getWelcomeDays(): number | undefined {
    return this.props.welcomeDays;
  }

  getLastVisitDays(): number | undefined {
    return this.props.lastVisitDays;
  }

  getProductCategories(): string[] | undefined {
    return this.props.productCategories;
  }

  /**
   * Calculate the total merchant points to award for this campaign, optionally
   * filtered to only matched product categories.
   *
   * - No `productCategories` configured → full multiplier on `basePoints` (default).
   * - `productCategories` configured, no `lineItems` provided → full multiplier (backward compat).
   * - `productCategories` configured AND `lineItems` provided:
   *   - Only line items whose `category` is in `productCategories` receive the bonus multiplier.
   *   - Non-matching items earn base-rate points (no bonus).
   *   - Returns `basePoints + incrementalBonus` (before any `maxPointsPerTransaction` cap).
   *
   * The `pointsPerSAR` parameter is the merchant's current `loyaltyConfig.pointsPerSAR`.
   */
  calculateCampaignBonus(basePoints: number, pointsPerSAR: number, lineItems?: LineItem[]): number {
    const categories = this.props.productCategories;
    if (!categories || categories.length === 0 || !lineItems || lineItems.length === 0) {
      // Full multiplier on all points
      return Math.floor(basePoints * this.props.multiplier);
    }

    // Sum only the matched line-item amounts
    const matchedAmountSAR = lineItems
      .filter((item) => categories.includes(item.category))
      .reduce((sum, item) => sum + item.amountSAR, 0);

    if (matchedAmountSAR === 0) {
      return basePoints; // No matched categories — base points only
    }

    const matchedPoints = Math.floor(matchedAmountSAR * pointsPerSAR);
    const incrementalBonus = Math.floor(matchedPoints * (this.props.multiplier - 1));
    return basePoints + incrementalBonus;
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
    if (!this.passesLastVisitFilter(ctx.lastTransactionAt)) return false;
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

  private passesLastVisitFilter(lastTransactionAt?: Date): boolean {
    const days = this.props.lastVisitDays;
    if (!days || days <= 0) return true;
    if (!lastTransactionAt) return true;
    const msThreshold = days * 24 * 60 * 60 * 1000;
    return Date.now() - lastTransactionAt.getTime() >= msThreshold;
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
    const days = this.props.winBackDays ?? 60;
    const msThreshold = days * 24 * 60 * 60 * 1000;
    return Date.now() - lastTransactionAt.getTime() >= msThreshold;
  }

  private isWelcomeEligible(enrolledAt: Date): boolean {
    const days = this.props.welcomeDays ?? 30;
    const msThreshold = days * 24 * 60 * 60 * 1000;
    return Date.now() - enrolledAt.getTime() <= msThreshold;
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

  // Update mutable campaign fields (merchant-facing edit)
  update(overrides: CampaignOverrides): void {
    this.applyDateOverrides(overrides);
    this.applyScalarOverrides(overrides);
    this.applyLimitOverrides(overrides);
    this.props.termsMessage = this.generateTermsMessage();
  }

  private applyDateOverrides(overrides: CampaignOverrides): void {
    if (overrides.startDate === undefined && overrides.endDate === undefined) return;
    const newStart = overrides.startDate ?? this.props.startDate;
    const newEnd = overrides.endDate ?? this.props.endDate;
    Campaign.validateDates(newStart, newEnd);
    this.props.startDate = newStart;
    this.props.endDate = newEnd;
  }

  private applyScalarOverrides(overrides: CampaignOverrides): void {
    this.applyTextOverrides(overrides);
    this.applyDayWindowOverrides(overrides);
    this.applyListOverrides(overrides);
  }

  private applyTextOverrides(overrides: CampaignOverrides): void {
    if (overrides.multiplier !== undefined) {
      Campaign.validateMultiplier(overrides.multiplier);
      this.props.multiplier = overrides.multiplier;
    }
    if (overrides.name !== undefined && overrides.name.trim().length > 0) {
      this.props.name = overrides.name.trim();
    }
    if (overrides.description !== undefined) {
      this.props.description = overrides.description.trim();
    }
    if (overrides.message !== undefined) {
      const trimmed = overrides.message.trim();
      if (trimmed) {
        this.props.message = trimmed;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.message;
      }
    }
  }

  private applyDayWindowOverrides(overrides: CampaignOverrides): void {
    if (overrides.winBackDays !== undefined) {
      if (overrides.winBackDays > 0) {
        this.props.winBackDays = overrides.winBackDays;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.winBackDays;
      }
    }
    if (overrides.welcomeDays !== undefined) {
      if (overrides.welcomeDays > 0) {
        this.props.welcomeDays = overrides.welcomeDays;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.welcomeDays;
      }
    }
    if (overrides.lastVisitDays !== undefined) {
      if (overrides.lastVisitDays > 0) {
        this.props.lastVisitDays = overrides.lastVisitDays;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.lastVisitDays;
      }
    }
  }

  private applyListOverrides(overrides: CampaignOverrides): void {
    if (overrides.targetTiers !== undefined) {
      if (overrides.targetTiers.length > 0) {
        this.props.targetTiers = overrides.targetTiers;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.targetTiers;
      }
    }
    if (overrides.productCategories !== undefined) {
      if (overrides.productCategories.length > 0) {
        this.props.productCategories = overrides.productCategories;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.productCategories;
      }
    }
  }

  private applyLimitOverrides(overrides: CampaignOverrides): void {
    if (overrides.maxUsesPerCustomer !== undefined) {
      if (overrides.maxUsesPerCustomer > 0) {
        this.props.maxUsesPerCustomer = overrides.maxUsesPerCustomer;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.maxUsesPerCustomer;
      }
    }
    if (overrides.minPurchaseAmount !== undefined) {
      if (overrides.minPurchaseAmount > 0) {
        this.props.minPurchaseAmount = overrides.minPurchaseAmount;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.minPurchaseAmount;
      }
    }
    if (overrides.maxPointsPerTransaction !== undefined) {
      if (overrides.maxPointsPerTransaction > 0) {
        this.props.maxPointsPerTransaction = overrides.maxPointsPerTransaction;
      } else {
        // biome-ignore lint/performance/noDelete: exactOptionalPropertyTypes requires delete to unset optional props
        delete this.props.maxPointsPerTransaction;
      }
    }
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
    this.addOptionalJsonFields(result);
    return result;
  }

  private addOptionalJsonFields(result: CampaignJSON): void {
    this.addOptionalJsonTextFields(result);
    this.addOptionalJsonNumericFields(result);
  }

  private addOptionalJsonTextFields(result: CampaignJSON): void {
    if (this.props.message) result.message = this.props.message;
    if (this.props.linkedPerkId) result.linkedPerkId = this.props.linkedPerkId;
    if (this.props.termsMessage) result.termsMessage = this.props.termsMessage;
    if (this.props.targetTiers && this.props.targetTiers.length > 0)
      result.targetTiers = this.props.targetTiers;
    if (this.props.productCategories && this.props.productCategories.length > 0)
      result.productCategories = this.props.productCategories;
  }

  private addOptionalJsonNumericFields(result: CampaignJSON): void {
    if (this.props.maxUsesPerCustomer && this.props.maxUsesPerCustomer > 0)
      result.maxUsesPerCustomer = this.props.maxUsesPerCustomer;
    if (this.props.minPurchaseAmount && this.props.minPurchaseAmount > 0)
      result.minPurchaseAmount = this.props.minPurchaseAmount;
    if (this.props.maxPointsPerTransaction && this.props.maxPointsPerTransaction > 0)
      result.maxPointsPerTransaction = this.props.maxPointsPerTransaction;
    if (this.props.winBackDays && this.props.winBackDays > 0)
      result.winBackDays = this.props.winBackDays;
    if (this.props.welcomeDays && this.props.welcomeDays > 0)
      result.welcomeDays = this.props.welcomeDays;
    if (this.props.lastVisitDays && this.props.lastVisitDays > 0)
      result.lastVisitDays = this.props.lastVisitDays;
  }
}
