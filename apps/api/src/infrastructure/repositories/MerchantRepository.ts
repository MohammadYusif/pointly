import type { IMerchantRepository } from '../../application/repositories/IMerchantRepository';
import type { QueryOptions, QueryResult } from '../../application/shared/interfaces/BaseRepository';
import {
  Email,
  type LocationInfo,
  type LoyaltyConfiguration,
  Merchant,
  type MerchantProps,
  MerchantStatus,
  type MerchantTier,
  PhoneNumber,
  type SMSQuota,
} from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface MerchantItem {
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
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  GSI1PK?: string; // EMAIL#<email>
  GSI1SK?: string; // MERCHANT
  GSI2PK?: string; // PHONE#<phone>
  GSI2SK?: string; // MERCHANT
  GSI3PK?: string; // STATUS#<status>
  GSI3SK?: string; // MERCHANT#<id>
}

export class MerchantRepository
  extends BaseDynamoDBRepository<Merchant>
  implements IMerchantRepository
{
  async findById(id: string): Promise<Merchant | null> {
    const item = await this.getItem<MerchantItem>(`MERCHANT#${id}`, 'PROFILE');
    return item ? this.toEntity(item) : null;
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
  }

  toPersistenceItem(entity: Merchant) {
    return [{
      tableName: this.tableName,
      item: this.entityToItem(entity) as unknown as Record<string, unknown>,
    }];
  }

  async delete(id: string): Promise<void> {
    await this.deleteItem(`MERCHANT#${id}`, 'PROFILE');
  }

  async exists(id: string): Promise<boolean> {
    return super.exists(`MERCHANT#${id}`, 'PROFILE');
  }

  // biome-ignore lint/suspicious/noExplicitAny: Base class override requires any for DynamoDB item
  protected toEntity(item: any): Merchant {
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

    // Normalize tier — map legacy values to valid MerchantTier enum
    const validTiers = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'];
    const tier = (validTiers.includes(item.tier) ? item.tier : 'BASIC') as MerchantTier;

    // Apply defaults for any missing loyaltyConfig fields (guards against old/manual records)
    // biome-ignore lint/suspicious/noExplicitAny: DynamoDB records may have legacy field names
    const rawConfig = (item.loyaltyConfig || {}) as any;
    const loyaltyConfig: LoyaltyConfiguration = {
      pointsPerSAR: rawConfig.pointsPerSAR ?? rawConfig.pointsPerUnit ?? 1,
      globalPointsPerSAR: rawConfig.globalPointsPerSAR ?? rawConfig.pointsPerUnit ?? 1,
      minimumPurchase: rawConfig.minimumPurchase ?? rawConfig.minimumTransaction ?? 10,
      redemptionRate: rawConfig.redemptionRate ?? 0.01,
      allowPartialRedemption: rawConfig.allowPartialRedemption ?? true,
      minimumRedemption: rawConfig.minimumRedemption ?? 100,
      welcomeBonus: rawConfig.welcomeBonus ?? 50,
      enableMultiLocation: rawConfig.enableMultiLocation ?? false,
    };

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
      maxLocations: item.maxLocations ?? 3,
      totalCustomers: item.totalCustomers ?? 0,
      activeCustomers: item.activeCustomers ?? 0,
      totalTransactions: item.totalTransactions ?? 0,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      ...(item.verifiedAt && { verifiedAt: new Date(item.verifiedAt) }),
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
      locations: json.locations,
      maxLocations: json.maxLocations,
      totalCustomers: json.totalCustomers,
      activeCustomers: json.activeCustomers,
      totalTransactions: json.totalTransactions,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      ...(json.verifiedAt && { verifiedAt: json.verifiedAt }),
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
