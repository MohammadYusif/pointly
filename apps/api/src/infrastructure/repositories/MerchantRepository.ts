import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IMerchantRepository } from '../../application/repositories/IMerchantRepository';
import type { QueryOptions, QueryResult } from '../../application/shared/interfaces/BaseRepository';
import {
  CustomerTierLevel,
  Email,
  type LocationInfo,
  type LoyaltyConfiguration,
  Merchant,
  type MerchantProps,
  MerchantStatus,
  MerchantTier,
  type PerkType,
  PhoneNumber,
  type SMSQuota,
  type WalletConfig,
} from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface MerchantItem {
  [key: string]: unknown;
  PK: string;
  SK: string;
  EntityType: 'MERCHANT';
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  contactName: string;
  tier: MerchantTier;
  status: MerchantStatus;
  loyaltyConfig: LoyaltyConfiguration;
  smsQuota: {
    monthlyLimit: number;
    currentUsage: number;
    resetDate: string;
  };
  locations: Array<{
    locationId: string;
    name: string;
    address: string;
    city: string;
    isActive: boolean;
    createdAt: string;
  }>;
  maxLocations: number;
  totalCustomers: number;
  activeCustomers: number;
  totalTransactions: number;
  activePerks?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    requiredTier: string;
    capacityLimit?: number;
    isActive: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  walletConfig?: WalletConfig;
  GSI1PK?: string; // EMAIL#<email>
  GSI1SK?: string; // MERCHANT
  GSI2PK?: string; // PHONE#<phone>
  GSI2SK?: string; // MERCHANT
  GSI3PK?: string; // STATUS#<status>
  GSI3SK?: string; // MERCHANT#<id>
}

/** Map a raw DynamoDB string to a valid MerchantTier, defaulting to BASIC for unknown values. */
function toMerchantTier(value: string): MerchantTier {
  const valid: Record<string, MerchantTier> = {
    BASIC: MerchantTier.BASIC,
    PROFESSIONAL: MerchantTier.PROFESSIONAL,
    ENTERPRISE: MerchantTier.ENTERPRISE,
  };
  return valid[value] ?? MerchantTier.BASIC;
}

/** Map a raw DynamoDB string to a valid PerkType, defaulting to EARLY_ACCESS for unknown values. */
function toPerkType(value: string): PerkType {
  const valid: Record<string, PerkType> = {
    EARLY_ACCESS: 'EARLY_ACCESS',
    EXCLUSIVE_PRODUCT: 'EXCLUSIVE_PRODUCT',
    EVENT: 'EVENT',
  };
  return valid[value] ?? 'EARLY_ACCESS';
}

/** Map a raw DynamoDB string to a valid CustomerTierLevel, defaulting to BRONZE for unknown values. */
function toCustomerTierLevel(value: string): CustomerTierLevel {
  const valid: Record<string, CustomerTierLevel> = {
    BRONZE: CustomerTierLevel.BRONZE,
    GOLD: CustomerTierLevel.GOLD,
    PLATINUM: CustomerTierLevel.PLATINUM,
    DIAMOND: CustomerTierLevel.DIAMOND,
  };
  return valid[value] ?? CustomerTierLevel.BRONZE;
}

export class MerchantRepository
  extends BaseDynamoDBRepository<Merchant>
  implements IMerchantRepository
{
  private readonly cache = new Map<string, { merchant: Merchant; expiresAt: number }>();
  private readonly cacheTtlMs: number;

  /**
   * @param client - DynamoDB document client
   * @param tableName - DynamoDB table name
   * @param cacheTtlMs - In-memory cache TTL in milliseconds (default 60 s). Set to 0 to disable.
   */
  constructor(client: DynamoDBDocumentClient, tableName: string, cacheTtlMs = 60_000) {
    super(client, tableName);
    this.cacheTtlMs = cacheTtlMs;
  }

  async findById(id: string): Promise<Merchant | null> {
    if (this.cacheTtlMs > 0) {
      const cached = this.cache.get(id);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.merchant;
      }
    }

    const item = await this.getItem<MerchantItem>(`MERCHANT#${id}`, 'PROFILE');
    const merchant = item ? this.toEntity(item) : null;

    if (merchant && this.cacheTtlMs > 0) {
      this.cache.set(id, { merchant, expiresAt: Date.now() + this.cacheTtlMs });
    }

    return merchant;
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    const result = await this.query<MerchantItem>({
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${email.toLowerCase()}`,
        ':sk': 'MERCHANT',
      },
      Limit: 1,
    });

    return result.items[0] ? this.toEntity(result.items[0]) : null;
  }

  async findByPhone(phone: string): Promise<Merchant | null> {
    const result = await this.query<MerchantItem>({
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `PHONE#${phone}`,
        ':sk': 'MERCHANT',
      },
      Limit: 1,
    });

    return result.items[0] ? this.toEntity(result.items[0]) : null;
  }

  async findVerified(options?: QueryOptions): Promise<QueryResult<Merchant>> {
    const result = await this.query<MerchantItem>(
      {
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `STATUS#${MerchantStatus.ACTIVE}`,
        },
      },
      options,
    );

    return {
      items: result.items.map((item) => this.toEntity(item)),
      count: result.count,
      nextToken: result.nextToken,
    };
  }

  async findPendingVerification(options?: QueryOptions): Promise<QueryResult<Merchant>> {
    const result = await this.query<MerchantItem>(
      {
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `STATUS#${MerchantStatus.PENDING_VERIFICATION}`,
        },
      },
      options,
    );

    return {
      items: result.items.map((item) => this.toEntity(item)),
      count: result.count,
      nextToken: result.nextToken,
    };
  }

  async findByTier(tier: MerchantTier, options?: QueryOptions): Promise<QueryResult<Merchant>> {
    const result = await this.query<MerchantItem>(
      {
        IndexName: 'TierIndex',
        KeyConditionExpression: 'GSI4PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `TIER#${tier}`,
        },
      },
      options,
    );

    return {
      items: result.items.map((item) => this.toEntity(item)),
      count: result.count,
      nextToken: result.nextToken,
    };
  }

  async save(entity: Merchant): Promise<void> {
    const item = this.entityToItem(entity);
    await this.putItem(item);
    this.invalidateCache(entity.getMerchantId());
  }

  /** Remove a single merchant entry from the in-memory cache. */
  invalidateCache(merchantId: string): void {
    this.cache.delete(merchantId);
  }

  toPersistenceItem(entity: Merchant) {
    return [
      {
        tableName: this.tableName,
        item: this.entityToItem(entity) as unknown as Record<string, unknown>,
      },
    ];
  }

  async delete(id: string): Promise<void> {
    await this.deleteItem(`MERCHANT#${id}`, 'PROFILE');
  }

  async exists(id: string): Promise<boolean> {
    return super.exists(`MERCHANT#${id}`, 'PROFILE');
  }

  protected toEntity(item: Record<string, unknown>): Merchant {
    return this.itemToEntity(item as MerchantItem);
  }

  protected toItem(entity: Merchant): MerchantItem {
    return this.entityToItem(entity);
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: DynamoDB item mapping with many optional fields
  private itemToEntity(item: MerchantItem): Merchant {
    const locations: LocationInfo[] = (item.locations || []).map((loc) => ({
      locationId: loc.locationId,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      isActive: loc.isActive,
      createdAt: new Date(loc.createdAt),
    }));

    const rawQuota = item.smsQuota || ({} as Partial<MerchantItem['smsQuota']>);
    const smsQuota: SMSQuota = {
      monthlyLimit: rawQuota.monthlyLimit ?? 100,
      currentUsage: rawQuota.currentUsage ?? 0,
      resetDate: rawQuota.resetDate
        ? new Date(rawQuota.resetDate)
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    };

    // Normalize tier — map legacy/unknown values to a valid MerchantTier enum member
    const tier = toMerchantTier(item.tier);

    // Apply defaults for any missing loyaltyConfig fields (guards against old/manual records).
    // Includes legacy field aliases (pointsPerUnit, minimumTransaction) from pre-migration records.
    const rawConfig = (item.loyaltyConfig || {}) as Partial<LoyaltyConfiguration> & {
      pointsPerUnit?: number;
      minimumTransaction?: number;
    };
    const loyaltyConfig: LoyaltyConfiguration = {
      pointsPerSAR: rawConfig.pointsPerSAR ?? rawConfig.pointsPerUnit ?? 1,
      globalPointsPerSAR: rawConfig.globalPointsPerSAR ?? rawConfig.pointsPerUnit ?? 1,
      minimumPurchase: rawConfig.minimumPurchase ?? rawConfig.minimumTransaction ?? 10,
      redemptionRate: rawConfig.redemptionRate ?? 0.01,
      allowPartialRedemption: rawConfig.allowPartialRedemption ?? true,
      minimumRedemption: rawConfig.minimumRedemption ?? 100,
      welcomeBonus: rawConfig.welcomeBonus ?? 50,
      enableMultiLocation: rawConfig.enableMultiLocation ?? false,
      ...(rawConfig.milestones &&
        rawConfig.milestones.length > 0 && {
          milestones: rawConfig.milestones,
        }),
    };

    const activePerks = (item.activePerks || []).map((p) => ({
      id: p.id,
      type: toPerkType(p.type),
      title: p.title,
      description: p.description,
      requiredTier: toCustomerTierLevel(p.requiredTier),
      ...(p.capacityLimit !== undefined && { capacityLimit: p.capacityLimit }),
      isActive: p.isActive,
      createdAt: new Date(p.createdAt),
    }));

    const props: MerchantProps = {
      merchantId: item.merchantId,
      businessName: item.businessName,
      email: new Email(item.email),
      phone: new PhoneNumber(item.phone),
      contactName: item.contactName,
      tier,
      status: item.status,
      loyaltyConfig,
      smsQuota,
      locations,
      activePerks,
      maxLocations: item.maxLocations ?? 3,
      totalCustomers: item.totalCustomers ?? 0,
      activeCustomers: item.activeCustomers ?? 0,
      totalTransactions: item.totalTransactions ?? 0,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      ...(item.verifiedAt && { verifiedAt: new Date(item.verifiedAt) }),
      ...(item.walletConfig && { walletConfig: item.walletConfig }),
    };

    return Merchant.reconstitute(props);
  }

  private entityToItem(entity: Merchant): MerchantItem {
    const json = entity.toJSON();

    const item: MerchantItem = {
      PK: `MERCHANT#${json.merchantId}`,
      SK: 'PROFILE',
      EntityType: 'MERCHANT',
      merchantId: json.merchantId,
      businessName: json.businessName,
      email: json.email,
      phone: json.phone,
      contactName: json.contactName,
      tier: json.tier,
      status: json.status,
      loyaltyConfig: json.loyaltyConfig,
      smsQuota: {
        monthlyLimit: json.smsQuota.monthlyLimit,
        currentUsage: json.smsQuota.currentUsage,
        resetDate:
          json.smsQuota.resetDate instanceof Date
            ? json.smsQuota.resetDate.toISOString()
            : json.smsQuota.resetDate,
      },
      activePerks: json.activePerks,
      locations: json.locations,
      maxLocations: json.maxLocations,
      totalCustomers: json.totalCustomers,
      activeCustomers: json.activeCustomers,
      totalTransactions: json.totalTransactions,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      ...(json.verifiedAt && { verifiedAt: json.verifiedAt }),
      ...(json.walletConfig && { walletConfig: json.walletConfig }),
      GSI1PK: `EMAIL#${json.email.toLowerCase()}`,
      GSI1SK: 'MERCHANT',
      GSI2PK: `PHONE#${json.phone}`,
      GSI2SK: 'MERCHANT',
      GSI3PK: `STATUS#${json.status}`,
      GSI3SK: `MERCHANT#${json.merchantId}`,
    };

    return item;
  }
}
