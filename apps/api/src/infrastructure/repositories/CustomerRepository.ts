import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import type { ICustomerRepository } from '../../application/repositories/ICustomerRepository';
import type { QueryOptions, QueryResult } from '../../application/shared/interfaces/BaseRepository';
import {
  ConsentStatus,
  Customer,
  type CustomerEnrollment,
  type CustomerProps,
  type CustomerStatus,
  CustomerTier,
  type CustomerTierLevel,
  DEFAULT_TIER,
  PhoneNumber,
  Points,
  VALID_TIER_LEVELS,
} from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface CustomerItem {
  PK: string;
  SK: string;
  EntityType: 'CUSTOMER';
  customerId: string;
  phone: string;
  name: string | undefined;
  dateOfBirth?: string;
  status: CustomerStatus;
  globalPointsBalance: number;
  globalLifetimePoints: number;
  currentTier: string;
  monthlyProgress: number;
  tierLastUpdatedAt: string;
  monthlyProgressResetAt: string;
  lastNetworkActivity: string;
  globalPointsDecayPhase: number;
  decayStartDate: string | undefined;
  lastDecayAppliedAt: string | undefined;
  lastInactivityWarningSentAt: string | undefined;
  weeklyVisitDates?: string[];
  lastStreakResetAt?: string;
  claimedMilestones?: string[];
  referralCode?: string;
  referredBy?: string;
  enrollments: EnrollmentItem[];
  createdAt: string;
  updatedAt: string;
  GSI1PK: string | undefined;
  GSI1SK: string | undefined;
  /**
   * GSI2 is used for the merchant-customers adjacency list pattern.
   * Access pattern: query MERCHANT#<id>#CUSTOMERS to list all customers of a merchant.
   * These fields are NOT populated on the main PROFILE item — they live on separate
   * MERCHANT_INDEX#<merchantId> items written by toMerchantIndexItems().
   * Reserved here for type completeness only; never written on PROFILE records.
   */
  GSI2PK?: string;
  GSI2SK?: string;
}

interface EnrollmentItem {
  merchantId: string;
  enrolledAt: string;
  consentStatus: ConsentStatus;
  consentGrantedAt: string | undefined;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  lastTransactionAt: string | undefined;
  welcomeBonusApplied?: boolean;
}

export class CustomerRepository
  extends BaseDynamoDBRepository<Customer>
  implements ICustomerRepository
{
  async findById(id: string): Promise<Customer | null> {
    const item = await this.getItem<CustomerItem>(`CUSTOMER#${id}`, 'PROFILE');
    return item ? this.itemToEntity(item) : null;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    // Phone is stored as digits only (e.g. "966512345678"), strip leading "+"
    const normalized = phone.replace(/^\+/, '');
    const result = await this.query<CustomerItem>({
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: {
        ':phone': normalized,
      },
      Limit: 1,
    });

    const firstItem = result.items[0];
    return firstItem ? this.itemToEntity(firstItem) : null;
  }

  async findByReferralCode(code: string): Promise<Customer | null> {
    // Scan EntityTypeIndex (CUSTOMER-only partition) with a FilterExpression.
    // Referral lookups are infrequent (first purchase only) so a filtered GSI scan is acceptable.
    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: 'EntityType = :entityType',
      FilterExpression: 'referralCode = :code',
      ExpressionAttributeValues: {
        ':entityType': 'CUSTOMER',
        ':code': code,
      },
      Limit: 1,
    };
    const result = await this.client.send(new QueryCommand(queryInput));
    const item = (result.Items || [])[0];
    return item ? this.itemToEntity(item as unknown as CustomerItem) : null;
  }

  async findByMerchant(merchantId: string, options?: QueryOptions): Promise<QueryResult<Customer>> {
    // Step 1: Query GSI2 for per-merchant index items (adjacency list pattern)
    const indexResult = await this.query<{ customerId: string }>(
      {
        IndexName: 'MerchantCustomersIndex',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MERCHANT#${merchantId}#CUSTOMERS`,
        },
      },
      options,
    );

    if (indexResult.items.length === 0) {
      return { items: [], count: 0, nextToken: indexResult.nextToken };
    }

    // Step 2: Batch-get full customer records
    const customers = await Promise.all(
      indexResult.items.map((idx) => this.findById(idx.customerId)),
    );

    const validCustomers = customers.filter((c): c is Customer => c !== null);

    return {
      items: validCustomers,
      count: validCustomers.length,
      nextToken: indexResult.nextToken,
    };
  }

  async findAll(options?: QueryOptions): Promise<QueryResult<Customer>> {
    // Use EntityTypeIndex GSI so we query only CUSTOMER items (O(customers))
    // instead of scanning the entire mixed-entity table (O(all entities)).
    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'CUSTOMER',
      },
      Limit: options?.limit || 100,
    };

    if (options?.nextToken) {
      queryInput.ExclusiveStartKey = JSON.parse(
        Buffer.from(options.nextToken, 'base64').toString(),
      );
    }

    const result = await this.client.send(new QueryCommand(queryInput));

    return {
      items: (result.Items || []).map((item) => this.itemToEntity(item as unknown as CustomerItem)),
      count: result.Count || 0,
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }

  async isEnrolled(customerId: string, merchantId: string): Promise<boolean> {
    const customer = await this.findById(customerId);
    if (!customer) return false;

    const enrollment = customer.getEnrollment(merchantId);
    return enrollment !== undefined;
  }

  async save(entity: Customer): Promise<void> {
    const items = this.toPersistenceItem(entity);
    for (const persistenceItem of items) {
      await this.putItem(persistenceItem.item);
    }
  }

  toPersistenceItem(entity: Customer) {
    return [
      {
        tableName: this.tableName,
        item: this.toItem(entity) as Record<string, unknown>,
      },
    ];
  }

  /**
   * Returns [profile, merchantIndex] persistence items for an enrollment where
   * consent is granted. Callers never need to know two items are required and
   * can never forget to include the index.
   *
   * Use toPersistenceItem() (profile-only) for purchase / redemption / decay
   * writes that must stay within DynamoDB's 25-item TransactWriteItems limit.
   */
  toEnrollmentItems(entity: Customer, merchantId: string) {
    const profileItem = {
      tableName: this.tableName,
      item: this.toItem(entity) as Record<string, unknown>,
    };
    const indexItem = this.buildMerchantIndexItem(entity, merchantId);
    return indexItem ? [profileItem, indexItem] : [profileItem];
  }

  /**
   * Build the GSI2 adjacency-list index item for one merchant enrollment.
   * Returns null when the enrollment is missing.
   * Private — call toEnrollmentItems() from outside this class.
   */
  private buildMerchantIndexItem(entity: Customer, merchantId: string) {
    const json = entity.toJSON();
    // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
    const enrollment = json.enrollments.find((e: any) => e.merchantId === merchantId);
    if (!enrollment) {
      return null;
    }
    return {
      tableName: this.tableName,
      item: {
        PK: `CUSTOMER#${json.customerId}`,
        SK: `MERCHANT_INDEX#${merchantId}`,
        EntityType: 'MERCHANT_CUSTOMER_INDEX',
        GSI2PK: `MERCHANT#${merchantId}#CUSTOMERS`,
        GSI2SK: `CUSTOMER#${json.customerId}`,
        customerId: json.customerId,
      } as Record<string, unknown>,
    };
  }

  async delete(id: string): Promise<void> {
    await this.deleteItem(`CUSTOMER#${id}`, 'PROFILE');
    const indexItems = await this.query<{ PK: string; SK: string }>(
      {
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `CUSTOMER#${id}`, ':prefix': 'MERCHANT_INDEX#' },
        ProjectionExpression: 'PK, SK',
      },
      { limit: 500 },
    );
    await Promise.all(indexItems.items.map((item) => this.deleteItem(item.PK, item.SK)));
  }

  async exists(id: string): Promise<boolean> {
    return super.exists(`CUSTOMER#${id}`, 'PROFILE');
  }

  /**
   * Parse a date string with a guaranteed fallback (for required fields).
   * Handles ISO strings, Date objects, and empty/invalid DynamoDB map values.
   */
  private static parseDate(value: unknown, fallback: Date): Date {
    if (!value) return fallback;
    if (typeof value === 'string' && value.length > 0) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? fallback : d;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    return fallback;
  }

  /**
   * Parse a date string, returning undefined if not present or invalid (for optional fields).
   * Eliminates the need for `null as unknown as Date` hacks on optional date fields.
   */
  private static parseDateOptional(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: DynamoDB item mapping with many optional fields and date parsing
  private itemToEntity(customerItem: CustomerItem): Customer {
    const createdAt = new Date(customerItem.createdAt);
    const enrollments = new Map<string, CustomerEnrollment>();
    for (const enrollment of customerItem.enrollments || []) {
      const enrollmentData: CustomerEnrollment = {
        merchantId: enrollment.merchantId,
        enrolledAt: CustomerRepository.parseDate(enrollment.enrolledAt, createdAt),
        consentStatus: enrollment.consentStatus || ConsentStatus.GRANTED,
        merchantPointsBalance: Points.from(enrollment.merchantPointsBalance ?? 0),
        merchantLifetimePoints: Points.from(enrollment.merchantLifetimePoints ?? 0),
        transactionCount: enrollment.transactionCount ?? 0,
        welcomeBonusApplied: enrollment.welcomeBonusApplied ?? false,
      };

      const consentDate = CustomerRepository.parseDateOptional(enrollment.consentGrantedAt);
      if (consentDate) {
        enrollmentData.consentGrantedAt = consentDate;
      }
      const lastTxDate = CustomerRepository.parseDateOptional(enrollment.lastTransactionAt);
      if (lastTxDate) {
        enrollmentData.lastTransactionAt = lastTxDate;
      }

      enrollments.set(enrollment.merchantId, enrollmentData);
    }

    // Default tier fields for records created before the tier system was added
    const tierLevel = VALID_TIER_LEVELS.includes(customerItem.currentTier)
      ? (customerItem.currentTier as CustomerTierLevel)
      : (DEFAULT_TIER as CustomerTierLevel);

    const props: CustomerProps = {
      customerId: customerItem.customerId,
      phone: new PhoneNumber(customerItem.phone),
      status: customerItem.status,
      globalPointsBalance: Points.from(customerItem.globalPointsBalance ?? 0),
      globalLifetimePoints: Points.from(customerItem.globalLifetimePoints ?? 0),
      currentTier: CustomerTier.fromLevel(tierLevel),
      monthlyProgress: Points.from(customerItem.monthlyProgress ?? 0),
      tierLastUpdatedAt: CustomerRepository.parseDate(customerItem.tierLastUpdatedAt, createdAt),
      monthlyProgressResetAt: CustomerRepository.parseDate(
        customerItem.monthlyProgressResetAt,
        createdAt,
      ),
      lastNetworkActivity: CustomerRepository.parseDate(
        customerItem.lastNetworkActivity,
        createdAt,
      ),
      globalPointsDecayPhase: customerItem.globalPointsDecayPhase ?? 0,
      weeklyVisitDates: customerItem.weeklyVisitDates || [],
      lastStreakResetAt: CustomerRepository.parseDate(customerItem.lastStreakResetAt, createdAt),
      claimedMilestones: customerItem.claimedMilestones || [],
      // Migration-safe: generate a referral code for pre-existing records that lack one
      referralCode: customerItem.referralCode || ulid().slice(-8).toUpperCase(),
      enrollments,
      createdAt,
      updatedAt: new Date(customerItem.updatedAt),
    };

    if (customerItem.name) {
      props.name = customerItem.name;
    }
    if (customerItem.dateOfBirth) {
      props.dateOfBirth = customerItem.dateOfBirth;
    }
    if (customerItem.referredBy) {
      props.referredBy = customerItem.referredBy;
    }
    const decayStartDate = CustomerRepository.parseDateOptional(customerItem.decayStartDate);
    if (decayStartDate) {
      props.decayStartDate = decayStartDate;
    }
    const lastDecayAppliedAt = CustomerRepository.parseDateOptional(
      customerItem.lastDecayAppliedAt,
    );
    if (lastDecayAppliedAt) {
      props.lastDecayAppliedAt = lastDecayAppliedAt;
    }
    const lastInactivityWarningSentAt = CustomerRepository.parseDateOptional(
      customerItem.lastInactivityWarningSentAt,
    );
    if (lastInactivityWarningSentAt) {
      props.lastInactivityWarningSentAt = lastInactivityWarningSentAt;
    }

    return Customer.reconstitute(props);
  }

  protected toEntity(item: Record<string, unknown>): Customer {
    return this.itemToEntity(item as unknown as CustomerItem);
  }

  protected toItem(entity: Customer): Record<string, unknown> {
    const json = entity.toJSON();
    // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
    const enrollments: EnrollmentItem[] = json.enrollments.map((e: any) => {
      const enrollment: EnrollmentItem = {
        merchantId: e.merchantId,
        enrolledAt: e.enrolledAt,
        consentStatus: e.consentStatus,
        consentGrantedAt: e.consentGrantedAt,
        merchantPointsBalance: e.merchantPointsBalance,
        merchantLifetimePoints: e.merchantLifetimePoints,
        transactionCount: e.transactionCount,
        lastTransactionAt: e.lastTransactionAt,
        welcomeBonusApplied: e.welcomeBonusApplied ?? false,
      };
      return enrollment;
    });

    // Main customer item — no GSI2 here.
    // Per-merchant GSI2 entries are separate index items (adjacency list pattern).
    const item: CustomerItem = {
      PK: `CUSTOMER#${json.customerId}`,
      SK: 'PROFILE',
      EntityType: 'CUSTOMER',
      customerId: json.customerId,
      phone: json.phone,
      name: json.name,
      status: json.status,
      globalPointsBalance: json.globalPointsBalance,
      globalLifetimePoints: json.globalLifetimePoints,
      currentTier: json.currentTier,
      monthlyProgress: json.monthlyProgress,
      tierLastUpdatedAt: json.tierLastUpdatedAt,
      monthlyProgressResetAt: json.monthlyProgressResetAt,
      lastNetworkActivity: json.lastNetworkActivity,
      globalPointsDecayPhase: entity.getGlobalPointsDecayPhase(),
      decayStartDate: entity.getDecayStartDate()?.toISOString(),
      lastDecayAppliedAt: entity.getLastDecayAppliedAt()?.toISOString(),
      lastInactivityWarningSentAt: entity.getLastInactivityWarningSentAt()?.toISOString(),
      weeklyVisitDates: json.weeklyVisitDates,
      lastStreakResetAt: json.lastStreakResetAt,
      claimedMilestones: json.claimedMilestones,
      referralCode: json.referralCode,
      ...(json.referredBy && { referredBy: json.referredBy }),
      enrollments,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      GSI1PK: `PHONE#${json.phone}`,
      GSI1SK: 'CUSTOMER',
    };

    if (json.dateOfBirth) {
      item.dateOfBirth = json.dateOfBirth;
    }

    return item as unknown as Record<string, unknown>;
  }
}
