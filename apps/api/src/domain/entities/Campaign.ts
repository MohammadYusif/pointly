import { ulid } from 'ulid';
import { ValidationError } from '../errors/DomainError';

export interface CampaignProps {
  campaignId: string;
  merchantId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
  isActive: boolean;
  createdAt: Date;
}

export class Campaign {
  private constructor(private props: CampaignProps) {}

  static create(
    merchantId: string,
    name: string,
    description: string,
    startDate: Date,
    endDate: Date,
    multiplier: number,
  ): Campaign {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Campaign name is required');
    }

    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    if (multiplier < 1.0 || multiplier > 5.0) {
      throw new ValidationError('Multiplier must be between 1.0 and 5.0');
    }

    return new Campaign({
      campaignId: ulid(),
      merchantId,
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate,
      multiplier,
      isActive: true,
      createdAt: new Date(),
    });
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

  getCreatedAt(): Date {
    return this.props.createdAt;
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
  toJSON() {
    return {
      campaignId: this.props.campaignId,
      merchantId: this.props.merchantId,
      name: this.props.name,
      description: this.props.description,
      startDate: this.props.startDate.toISOString(),
      endDate: this.props.endDate.toISOString(),
      multiplier: this.props.multiplier,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
