import { ulid } from 'ulid';
import type { CustomerTierLevel } from '../config/TierConfig';
import { ValidationError } from '../errors/DomainError';
import type { Email } from '../value-objects/Email';
import type { PhoneNumber } from '../value-objects/PhoneNumber';

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum MerchantTier {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  createdAt: Date;
}

export interface LoyaltyConfiguration {
  pointsPerSAR: number;
  globalPointsPerSAR: number;
  minimumPurchase: number;
  redemptionRate: number;
  allowPartialRedemption: boolean;
  minimumRedemption: number;
  welcomeBonus: number;
  enableMultiLocation: boolean;
}

export interface SMSQuota {
  monthlyLimit: number;
  currentUsage: number;
  resetDate: Date;
}

export interface PointsCalculation {
  merchantPoints: number;
  globalPoints: number;
}

export type PerkType = 'EARLY_ACCESS' | 'EXCLUSIVE_PRODUCT' | 'EVENT';

export interface MerchantPerk {
  id: string;
  type: PerkType;
  title: string;
  description: string;
  requiredTier: CustomerTierLevel;
  capacityLimit?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface MerchantProps {
  merchantId: string;
  businessName: string;
  email: Email;
  phone: PhoneNumber;
  contactName: string;
  tier: MerchantTier;
  status: MerchantStatus;
  loyaltyConfig: LoyaltyConfiguration;
  smsQuota: SMSQuota;
  locations: LocationInfo[];
  maxLocations: number;
  activePerks: MerchantPerk[];
  totalCustomers: number;
  activeCustomers: number;
  totalTransactions: number;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

export class Merchant {
  private constructor(private props: MerchantProps) {}

  // Factory methods
  static create(
    businessName: string,
    email: Email,
    phone: PhoneNumber,
    contactName: string,
    tier: MerchantTier = MerchantTier.BASIC,
  ): Merchant {
    const defaultConfig = Merchant.getDefaultLoyaltyConfig(tier);
    const defaultSMSQuota = Merchant.getDefaultSMSQuota(tier);
    const maxLocations = Merchant.getMaxLocationsForTier(tier);

    // Create default primary location
    const primaryLocation: LocationInfo = {
      locationId: ulid(),
      name: 'Main Location',
      address: '',
      city: '',
      isActive: true,
      createdAt: new Date(),
    };

    return new Merchant({
      merchantId: ulid(),
      businessName,
      email,
      phone,
      contactName,
      tier,
      status: MerchantStatus.PENDING_VERIFICATION,
      loyaltyConfig: defaultConfig,
      smsQuota: defaultSMSQuota,
      locations: [primaryLocation],
      maxLocations,
      activePerks: [],
      totalCustomers: 0,
      activeCustomers: 0,
      totalTransactions: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: MerchantProps): Merchant {
    return new Merchant(props);
  }

  private static getDefaultLoyaltyConfig(tier: MerchantTier): LoyaltyConfiguration {
    const configs: Record<MerchantTier, LoyaltyConfiguration> = {
      [MerchantTier.BASIC]: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 10,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 100,
        welcomeBonus: 50,
        enableMultiLocation: false,
      },
      [MerchantTier.PROFESSIONAL]: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 5,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 50,
        welcomeBonus: 100,
        enableMultiLocation: true,
      },
      [MerchantTier.ENTERPRISE]: {
        pointsPerSAR: 1,
        globalPointsPerSAR: 1,
        minimumPurchase: 0,
        redemptionRate: 0.01,
        allowPartialRedemption: true,
        minimumRedemption: 25,
        welcomeBonus: 200,
        enableMultiLocation: true,
      },
    };
    return configs[tier];
  }

  private static getDefaultSMSQuota(tier: MerchantTier): SMSQuota {
    const quotas: Record<MerchantTier, number> = {
      [MerchantTier.BASIC]: 100,
      [MerchantTier.PROFESSIONAL]: 500,
      [MerchantTier.ENTERPRISE]: 2000,
    };

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      monthlyLimit: quotas[tier],
      currentUsage: 0,
      resetDate: nextMonth,
    };
  }

  private static getMaxLocationsForTier(tier: MerchantTier): number {
    const limits: Record<MerchantTier, number> = {
      [MerchantTier.BASIC]: 1,
      [MerchantTier.PROFESSIONAL]: 3,
      [MerchantTier.ENTERPRISE]: 999,
    };
    return limits[tier];
  }

  // Getters
  getMerchantId(): string {
    return this.props.merchantId;
  }

  getBusinessName(): string {
    return this.props.businessName;
  }

  getEmail(): Email {
    return this.props.email;
  }

  getPhone(): PhoneNumber {
    return this.props.phone;
  }

  getContactName(): string {
    return this.props.contactName;
  }

  getTier(): MerchantTier {
    return this.props.tier;
  }

  getStatus(): MerchantStatus {
    return this.props.status;
  }

  getLoyaltyConfig(): LoyaltyConfiguration {
    return { ...this.props.loyaltyConfig };
  }

  getSMSQuota(): SMSQuota {
    return { ...this.props.smsQuota };
  }

  getLocations(): LocationInfo[] {
    return [...this.props.locations];
  }

  getActiveLocations(): LocationInfo[] {
    return this.props.locations.filter((loc) => loc.isActive);
  }

  getMaxLocations(): number {
    return this.props.maxLocations;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getVerifiedAt(): Date | undefined {
    return this.props.verifiedAt;
  }

  /**
   * Check if merchant is verified and active
   */
  isVerified(): boolean {
    return this.props.status === MerchantStatus.ACTIVE && this.props.verifiedAt !== undefined;
  }

  // Location management methods
  addLocation(name: string, address: string, city: string): LocationInfo {
    if (!this.props.loyaltyConfig.enableMultiLocation) {
      throw new ValidationError(
        'Multi-location is not enabled for this tier. Upgrade to Professional or Enterprise.',
      );
    }

    const activeLocations = this.getActiveLocations();
    if (activeLocations.length >= this.props.maxLocations) {
      throw new ValidationError(
        `Maximum locations (${this.props.maxLocations}) reached for ${this.props.tier} tier`,
      );
    }

    const newLocation: LocationInfo = {
      locationId: ulid(),
      name,
      address,
      city,
      isActive: true,
      createdAt: new Date(),
    };

    this.props.locations.push(newLocation);
    this.props.updatedAt = new Date();

    return newLocation;
  }

  updateLocation(
    locationId: string,
    updates: { name?: string; address?: string; city?: string },
  ): void {
    const location = this.props.locations.find((loc) => loc.locationId === locationId);
    if (!location) {
      throw new ValidationError('Location not found');
    }

    if (updates.name !== undefined) location.name = updates.name;
    if (updates.address !== undefined) location.address = updates.address;
    if (updates.city !== undefined) location.city = updates.city;

    this.props.updatedAt = new Date();
  }

  deactivateLocation(locationId: string): void {
    const location = this.props.locations.find((loc) => loc.locationId === locationId);
    if (!location) {
      throw new ValidationError('Location not found');
    }

    const activeLocations = this.getActiveLocations();
    if (activeLocations.length <= 1) {
      throw new ValidationError('Cannot deactivate the last active location');
    }

    location.isActive = false;
    this.props.updatedAt = new Date();
  }

  reactivateLocation(locationId: string): void {
    const location = this.props.locations.find((loc) => loc.locationId === locationId);
    if (!location) {
      throw new ValidationError('Location not found');
    }

    if (location.isActive) {
      throw new ValidationError('Location is already active');
    }

    const activeLocations = this.getActiveLocations();
    if (activeLocations.length >= this.props.maxLocations) {
      throw new ValidationError(`Maximum active locations (${this.props.maxLocations}) reached`);
    }

    location.isActive = true;
    this.props.updatedAt = new Date();
  }

  // Business methods
  verify(): void {
    if (this.props.status === MerchantStatus.ACTIVE) {
      throw new ValidationError('Merchant already verified');
    }

    this.props.status = MerchantStatus.ACTIVE;
    this.props.verifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.status = MerchantStatus.SUSPENDED;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    if (!this.props.verifiedAt) {
      throw new ValidationError('Merchant must be verified before activation');
    }

    this.props.status = MerchantStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  updateLoyaltyConfig(config: Partial<LoyaltyConfiguration>): void {
    // Prevent enabling multi-location on BASIC tier
    if (config.enableMultiLocation === true && this.props.tier === MerchantTier.BASIC) {
      throw new ValidationError('Multi-location is not available for BASIC tier');
    }

    this.props.loyaltyConfig = {
      ...this.props.loyaltyConfig,
      ...config,
    };
    this.props.updatedAt = new Date();
  }

  updateBusinessInfo(updates: {
    businessName?: string;
    contactName?: string;
    email?: Email;
    phone?: PhoneNumber;
  }): void {
    if (updates.businessName) this.props.businessName = updates.businessName;
    if (updates.contactName) this.props.contactName = updates.contactName;
    if (updates.email) this.props.email = updates.email;
    if (updates.phone) this.props.phone = updates.phone;
    this.props.updatedAt = new Date();
  }

  upgradeTier(newTier: MerchantTier): void {
    const tierOrder = {
      [MerchantTier.BASIC]: 1,
      [MerchantTier.PROFESSIONAL]: 2,
      [MerchantTier.ENTERPRISE]: 3,
    };

    if (tierOrder[newTier] <= tierOrder[this.props.tier]) {
      throw new ValidationError('Can only upgrade to a higher tier');
    }

    this.props.tier = newTier;
    this.props.loyaltyConfig = Merchant.getDefaultLoyaltyConfig(newTier);
    this.props.smsQuota = Merchant.getDefaultSMSQuota(newTier);
    this.props.maxLocations = Merchant.getMaxLocationsForTier(newTier);
    this.props.updatedAt = new Date();
  }

  useSMS(count = 1): void {
    // Lazy reset: if we've passed the reset date, reset quota first
    if (new Date() >= this.props.smsQuota.resetDate) {
      this.resetSMSQuota();
    }

    if (this.props.smsQuota.currentUsage + count > this.props.smsQuota.monthlyLimit) {
      throw new ValidationError('SMS quota exceeded');
    }

    this.props.smsQuota.currentUsage += count;
    this.props.updatedAt = new Date();
  }

  resetSMSQuota(): void {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    this.props.smsQuota.currentUsage = 0;
    this.props.smsQuota.resetDate = nextMonth;
    this.props.updatedAt = new Date();
  }

  incrementCustomerCount(): void {
    this.props.totalCustomers++;
    this.props.activeCustomers++;
    this.props.updatedAt = new Date();
  }

  incrementTransactionCount(): void {
    this.props.totalTransactions++;
    this.props.updatedAt = new Date();
  }

  /**
   * Calculate points for a purchase - returns both merchant and global points
   */
  calculatePointsForPurchase(amountSAR: number): PointsCalculation {
    if (amountSAR < this.props.loyaltyConfig.minimumPurchase) {
      return { merchantPoints: 0, globalPoints: 0 };
    }

    const merchantPoints = Math.floor(amountSAR * this.props.loyaltyConfig.pointsPerSAR);
    const globalPoints = Math.floor(amountSAR * this.props.loyaltyConfig.globalPointsPerSAR);

    return { merchantPoints, globalPoints };
  }

  // Perk management
  getPerks(): MerchantPerk[] {
    return [...this.props.activePerks];
  }

  addPerk(data: Omit<MerchantPerk, 'id' | 'isActive' | 'createdAt'>): MerchantPerk {
    const perk: MerchantPerk = {
      id: ulid(),
      ...data,
      isActive: true,
      createdAt: new Date(),
    };
    this.props.activePerks.push(perk);
    this.props.updatedAt = new Date();
    return perk;
  }

  updatePerk(perkId: string, data: Partial<Omit<MerchantPerk, 'id' | 'createdAt'>>): void {
    const perk = this.props.activePerks.find((p) => p.id === perkId);
    if (!perk) {
      throw new ValidationError(`Perk ${perkId} not found`);
    }
    Object.assign(perk, data);
    this.props.updatedAt = new Date();
  }

  removePerk(perkId: string): void {
    const perk = this.props.activePerks.find((p) => p.id === perkId);
    if (!perk) {
      throw new ValidationError(`Perk ${perkId} not found`);
    }
    perk.isActive = false;
    this.props.updatedAt = new Date();
  }

  // Serialization
  toJSON() {
    return {
      merchantId: this.props.merchantId,
      businessName: this.props.businessName,
      email: this.props.email.toString(),
      phone: this.props.phone.toString(),
      contactName: this.props.contactName,
      tier: this.props.tier,
      status: this.props.status,
      loyaltyConfig: this.props.loyaltyConfig,
      smsQuota: this.props.smsQuota,
      locations: this.props.locations.map((loc) => ({
        ...loc,
        createdAt: loc.createdAt.toISOString(),
      })),
      maxLocations: this.props.maxLocations,
      activePerks: this.props.activePerks.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      totalCustomers: this.props.totalCustomers,
      activeCustomers: this.props.activeCustomers,
      totalTransactions: this.props.totalTransactions,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      verifiedAt: this.props.verifiedAt?.toISOString(),
    };
  }
}
