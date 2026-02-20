import { ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
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
  enrollments: EnrollmentItem[];
  createdAt: string;
  updatedAt: string;
  GSI1PK: string | undefined;
  GSI1SK: string | undefined;
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

    // Filter out nulls and stale index items (customer revoked consent)
    const validCustomers = customers.filter((c): c is Customer => {
      if (!c) return false;
      const enrollment = c.getEnrollment(merchantId);
      return enrollment?.consentStatus === ConsentStatus.GRANTED;
    });

    return {
      items: validCustomers,
      count: validCustomers.length,
      nextToken: indexResult.nextToken,
    };
  }

  async findPendingConsents(
    merchantId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Customer>> {
    const result = await this.query<CustomerItem>(
      {
        IndexName: 'PendingConsentsIndex',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MERCHANT#${merchantId}#PENDING_CONSENT`,
        },
      },
      options,
    );

    return {
      items: result.items.map((item) => this.itemToEntity(item)),
      count: result.count,
      nextToken: result.nextToken,
    };
  }

  async findAll(options?: QueryOptions): Promise<QueryResult<Customer>> {
    const scanInput: ScanCommandInput = {
      TableName: this.tableName,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'CUSTOMER',
      },
      Limit: options?.limit || 100,
    };

    if (options?.nextToken) {
      scanInput.ExclusiveStartKey = JSON.parse(Buffer.from(options.nextToken, 'base64').toString());
    }

    const result = await this.client.send(new ScanCommand(scanInput));

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
    const mainItem = {
      tableName: this.tableName,
      item: this.toItem(entity) as Record<string, unknown>,
    };
    const indexItems = this.toMerchantIndexItems(entity);
    return [mainItem, ...indexItems];
  }

  async delete(id: string): Promise<void> {
    // Delete main customer item
    await this.deleteItem(`CUSTOMER#${id}`, 'PROFILE');
    // Note: merchant index items (SK=MERCHANT_INDEX#*) become stale
    // but are harmless — findByMerchant filters by consent status
  }

  async exists(id: string): Promise<boolean> {
    return super.exists(`CUSTOMER#${id}`, 'PROFILE');
  }

  /**
   * Parse a date value that may be an ISO string, a Date, or an empty/invalid object
   * (DynamoDB Document Client serializes Date objects as empty maps {"M":{}})
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: DynamoDB item mapping with many optional fields and date parsing
  private itemToEntity(customerItem: CustomerItem): Customer {
    const createdAt = new Date(customerItem.createdAt);
    const enrollments = new Map<string, CustomerEnrollment>();
    for (const enrollment of customerItem.enrollments || []) {
      const enrollmentData: CustomerEnrollment = {
        merchantId: enrollment.merchantId,
        enrolledAt: CustomerRepository.parseDate(enrollment.enrolledAt, createdAt),
        consentStatus: enrollment.consentStatus || ConsentStatus.PENDING,
        merchantPointsBalance: Points.from(enrollment.merchantPointsBalance ?? 0),
        merchantLifetimePoints: Points.from(enrollment.merchantLifetimePoints ?? 0),
        transactionCount: enrollment.transactionCount ?? 0,
      };

      const consentDate = CustomerRepository.parseDate(
        enrollment.consentGrantedAt,
        null as unknown as Date,
      );
      if (consentDate) {
        enrollmentData.consentGrantedAt = consentDate;
      }
      const lastTxDate = CustomerRepository.parseDate(
        enrollment.lastTransactionAt,
        null as unknown as Date,
      );
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
      enrollments,
      createdAt,
      updatedAt: new Date(customerItem.updatedAt),
    };

    if (customerItem.name) {
      props.name = customerItem.name;
    }
    if (customerItem.decayStartDate) {
      props.decayStartDate = CustomerRepository.parseDate(customerItem.decayStartDate, createdAt);
    }
    if (customerItem.lastDecayAppliedAt) {
      props.lastDecayAppliedAt = CustomerRepository.parseDate(
        customerItem.lastDecayAppliedAt,
        createdAt,
      );
    }
    if (customerItem.lastInactivityWarningSentAt) {
      props.lastInactivityWarningSentAt = CustomerRepository.parseDate(
        customerItem.lastInactivityWarningSentAt,
        createdAt,
      );
    }

    return Customer.reconstitute(props);
  }

  protected toEntity(item: Record<string, unknown>): Customer {
    return this.itemToEntity(item as unknown as CustomerItem);
  }

  /**
   * Build per-merchant index items (adjacency list pattern).
   * One index item per granted merchant, each projecting into GSI2
   * so findByMerchant can query MERCHANT#<id>#CUSTOMERS efficiently.
   */
  private toMerchantIndexItems(entity: Customer) {
    const json = entity.toJSON();
    const grantedMerchantIds = json.enrollments
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
      .filter((e: any) => e.consentStatus === ConsentStatus.GRANTED)
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
      .map((e: any) => e.merchantId as string);

    return grantedMerchantIds.map((merchantId: string) => ({
      tableName: this.tableName,
      item: {
        PK: `CUSTOMER#${json.customerId}`,
        SK: `MERCHANT_INDEX#${merchantId}`,
        EntityType: 'MERCHANT_CUSTOMER_INDEX',
        GSI2PK: `MERCHANT#${merchantId}#CUSTOMERS`,
        GSI2SK: `CUSTOMER#${json.customerId}`,
        customerId: json.customerId,
      } as Record<string, unknown>,
    }));
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
      globalPointsDecayPhase: json.globalPointsDecayPhase,
      decayStartDate: json.decayStartDate,
      lastDecayAppliedAt: json.lastDecayAppliedAt,
      lastInactivityWarningSentAt: json.lastInactivityWarningSentAt,
      enrollments,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      GSI1PK: `PHONE#${json.phone}`,
      GSI1SK: 'CUSTOMER',
    };

    return item as unknown as Record<string, unknown>;
  }
}
