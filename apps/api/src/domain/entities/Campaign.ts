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
  createdAt: string;
}

interface CampaignOverrides {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  multiplier?: number;
  message?: string;
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
    return result;
  }
}
