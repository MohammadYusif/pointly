import type {
  AnalyticsData,
  AnalyticsDataPoint,
  AnalyticsQuery,
  ITransactionRepository,
  TransactionStats,
} from '../../application/repositories/ITransactionRepository';
import type { QueryOptions, QueryResult } from '../../application/shared/interfaces/BaseRepository';
import {
  Money,
  Points,
  Transaction,
  type TransactionMetadata,
  type TransactionProps,
  TransactionStatus,
  TransactionType,
} from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface TransactionItem {
  PK: string;
  SK: string;
  EntityType: 'TRANSACTION';
  transactionId: string;
  merchantId: string;
  customerId: string;
  locationId?: string;
  type: TransactionType;
  status: TransactionStatus;
  points: number;
  amount?: {
    amount: number;
    currency: string;
  };
  balanceBefore: number;
  balanceAfter: number;
  metadata: TransactionMetadata;
  idempotencyKey: string;
  reversedTransactionId?: string;
  createdAt: string;
  completedAt?: string;
  GSI1PK?: string; // CUSTOMER#<customerId>
  GSI1SK?: string; // TXN#<createdAt>#<id>
  GSI2PK?: string; // MERCHANT#<merchantId>
  GSI2SK?: string; // TXN#<createdAt>#<id>
  GSI3PK?: string; // IDEMPOTENCY#<key>
  GSI3SK?: string; // TXN
  GSI5PK?: string; // MERCHANT#<merchantId>#LOCATION#<locationId>
  GSI5SK?: string; // TXN#<createdAt>#<id>
}

export class TransactionRepository
  extends BaseDynamoDBRepository<Transaction>
  implements ITransactionRepository
{
  async findById(id: string): Promise<Transaction | null> {
    const item = await this.getItem<TransactionItem>(`TRANSACTION#${id}`, 'DETAILS');
    return item ? this.toEntity(item) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null> {
    const result = await this.query<TransactionItem>({
      IndexName: 'IdempotencyIndex',
      KeyConditionExpression: 'GSI3PK = :pk AND GSI3SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `IDEMPOTENCY#${idempotencyKey}`,
        ':sk': 'TXN',
      },
      Limit: 1,
    });

    return result.items[0] ? this.toEntity(result.items[0]) : null;
  }

  async findByCustomer(
    customerId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>> {
    const result = await this.query<TransactionItem>(
      {
        IndexName: 'CustomerTransactionsIndex',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CUSTOMER#${customerId}`,
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

  async findByMerchant(
    merchantId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>> {
    const result = await this.query<TransactionItem>(
      {
        IndexName: 'MerchantTransactionsIndex',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MERCHANT#${merchantId}`,
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

  async findByCustomerAndMerchant(
    customerId: string,
    merchantId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>> {
    const result = await this.query<TransactionItem>(
      {
        IndexName: 'CustomerMerchantIndex',
        KeyConditionExpression: 'GSI4PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CUSTOMER#${customerId}#MERCHANT#${merchantId}`,
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

  async findByMerchantAndLocation(
    merchantId: string,
    locationId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>> {
    const result = await this.query<TransactionItem>(
      {
        IndexName: 'LocationTransactionsIndex',
        KeyConditionExpression: 'GSI5PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MERCHANT#${merchantId}#LOCATION#${locationId}`,
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

  async getMerchantAnalytics(merchantId: string, query: AnalyticsQuery): Promise<AnalyticsData> {
    const items = await this.queryAllItems({
      IndexName: 'MerchantTransactionsIndex',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pk': `MERCHANT#${merchantId}`,
        ':start': `TXN#${query.startDate}`,
        ':end': `TXN#${query.endDate}\uffff`,
        ':status': TransactionStatus.COMPLETED,
      },
    });

    return this.buildAnalytics(items, query.groupBy || 'day');
  }

  async getLocationAnalytics(
    merchantId: string,
    locationId: string,
    query: AnalyticsQuery,
  ): Promise<AnalyticsData> {
    const items = await this.queryAllItems({
      IndexName: 'LocationTransactionsIndex',
      KeyConditionExpression: 'GSI5PK = :pk AND GSI5SK BETWEEN :start AND :end',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pk': `MERCHANT#${merchantId}#LOCATION#${locationId}`,
        ':start': `TXN#${query.startDate}`,
        ':end': `TXN#${query.endDate}\uffff`,
        ':status': TransactionStatus.COMPLETED,
      },
    });

    return this.buildAnalytics(items, query.groupBy || 'day');
  }

  private async queryAllItems(input: Parameters<typeof this.query>[0]): Promise<TransactionItem[]> {
    const allItems: TransactionItem[] = [];
    let nextToken: string | undefined;

    do {
      const result = await this.query<TransactionItem>(
        input,
        nextToken ? { limit: 100, nextToken } : { limit: 100 },
      );
      allItems.push(...result.items);
      nextToken = result.nextToken;
    } while (nextToken);

    return allItems;
  }

  private buildAnalytics(
    items: TransactionItem[],
    groupBy: 'day' | 'week' | 'month',
  ): AnalyticsData {
    const buckets = new Map<string, AnalyticsDataPoint>();
    const periodCustomers = new Map<string, Set<string>>();
    const uniqueCustomers = new Set<string>();
    let totalRevenue = 0;
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;

    for (const item of items) {
      const period = this.getPeriodKey(item.createdAt, groupBy);
      uniqueCustomers.add(item.customerId);

      if (!buckets.has(period)) {
        buckets.set(period, this.emptyDataPoint(period));
        periodCustomers.set(period, new Set());
      }

      // biome-ignore lint/style/noNonNullAssertion: bucket was just set above
      const bucket = buckets.get(period)!;
      bucket.transactionCount++;
      periodCustomers.get(period)?.add(item.customerId);

      const rev = this.accumulateBucket(bucket, item);
      totalRevenue += rev;
      if (item.type === TransactionType.EARN) totalPointsEarned += item.points;
      if (item.type === TransactionType.REDEEM) totalPointsRedeemed += item.points;
    }

    for (const [period, customers] of periodCustomers) {
      const bucket = buckets.get(period);
      if (bucket) bucket.uniqueCustomers = customers.size;
    }

    const trends = Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));

    return {
      summary: {
        totalTransactions: items.length,
        totalRevenue,
        totalPointsEarned,
        totalPointsRedeemed,
        uniqueCustomers: uniqueCustomers.size,
        averageTransactionValue: items.length > 0 ? totalRevenue / items.length : 0,
      },
      trends,
    };
  }

  private emptyDataPoint(period: string): AnalyticsDataPoint {
    return {
      period,
      transactionCount: 0,
      earnCount: 0,
      redeemCount: 0,
      revenue: 0,
      pointsEarned: 0,
      pointsRedeemed: 0,
      uniqueCustomers: 0,
    };
  }

  /** Returns revenue amount added for this item */
  private accumulateBucket(bucket: AnalyticsDataPoint, item: TransactionItem): number {
    if (item.type === TransactionType.EARN) {
      bucket.earnCount++;
      bucket.pointsEarned += item.points;
      if (item.amount) {
        bucket.revenue += item.amount.amount;
        return item.amount.amount;
      }
    } else if (item.type === TransactionType.REDEEM) {
      bucket.redeemCount++;
      bucket.pointsRedeemed += item.points;
    }
    return 0;
  }

  private getPeriodKey(dateStr: string, groupBy: 'day' | 'week' | 'month'): string {
    const date = new Date(dateStr);
    if (groupBy === 'month') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'week') {
      const dayOfYear = Math.floor(
        (date.getTime() - new Date(date.getUTCFullYear(), 0, 1).getTime()) / 86400000,
      );
      const week = Math.ceil((dayOfYear + 1) / 7);
      return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    return date.toISOString().slice(0, 10);
  }

  async getMerchantStats(merchantId: string): Promise<TransactionStats> {
    const result = await this.query<TransactionItem>({
      IndexName: 'MerchantTransactionsIndex',
      KeyConditionExpression: 'GSI2PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `MERCHANT#${merchantId}`,
        ':status': TransactionStatus.COMPLETED,
      },
    });

    return this.calculateStats(result.items);
  }

  async getCustomerStats(customerId: string): Promise<TransactionStats> {
    const result = await this.query<TransactionItem>({
      IndexName: 'CustomerTransactionsIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `CUSTOMER#${customerId}`,
        ':status': TransactionStatus.COMPLETED,
      },
    });

    return this.calculateStats(result.items);
  }

  private calculateStats(items: TransactionItem[]): TransactionStats {
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    let totalAmount = 0;

    for (const item of items) {
      if (item.type === TransactionType.EARN) {
        totalPointsEarned += item.points;
        if (item.amount) {
          totalAmount += item.amount.amount;
        }
      } else if (item.type === TransactionType.REDEEM) {
        totalPointsRedeemed += item.points;
      }
    }

    return {
      totalTransactions: items.length,
      totalPointsEarned,
      totalPointsRedeemed,
      averageTransactionValue: items.length > 0 ? totalAmount / items.length : 0,
    };
  }

  async save(entity: Transaction): Promise<void> {
    const item = this.entityToItem(entity);
    await this.putItem(item);
  }

  async delete(id: string): Promise<void> {
    await this.deleteItem(`TRANSACTION#${id}`, 'DETAILS');
  }

  async exists(id: string): Promise<boolean> {
    return super.exists(`TRANSACTION#${id}`, 'DETAILS');
  }

  // biome-ignore lint/suspicious/noExplicitAny: Base class override requires any for DynamoDB item
  protected toEntity(item: any): Transaction {
    return this.itemToEntity(item as TransactionItem);
  }

  protected toItem(entity: Transaction): TransactionItem {
    return this.entityToItem(entity);
  }

  private itemToEntity(item: TransactionItem): Transaction {
    const props: TransactionProps = {
      transactionId: item.transactionId,
      merchantId: item.merchantId,
      customerId: item.customerId,
      ...(item.locationId ? { locationId: item.locationId } : {}),
      type: item.type,
      status: item.status,
      points: Points.from(item.points),
      balanceBefore: Points.from(item.balanceBefore),
      balanceAfter: Points.from(item.balanceAfter),
      metadata: item.metadata,
      idempotencyKey: item.idempotencyKey,
      createdAt: new Date(item.createdAt),
      ...(item.amount && { amount: Money.fromSAR(item.amount.amount) }),
      ...(item.reversedTransactionId && { reversedTransactionId: item.reversedTransactionId }),
      ...(item.completedAt && { completedAt: new Date(item.completedAt) }),
    };

    return Transaction.reconstitute(props);
  }

  private entityToItem(entity: Transaction): TransactionItem {
    const json = entity.toJSON();
    const createdAt = json.createdAt;

    const item: TransactionItem = {
      PK: `TRANSACTION#${json.transactionId}`,
      SK: 'DETAILS',
      EntityType: 'TRANSACTION',
      transactionId: json.transactionId,
      merchantId: json.merchantId,
      customerId: json.customerId,
      type: json.type,
      status: json.status,
      points: json.points,
      balanceBefore: json.balanceBefore,
      balanceAfter: json.balanceAfter,
      metadata: json.metadata,
      idempotencyKey: json.idempotencyKey,
      createdAt: json.createdAt,
      GSI1PK: `CUSTOMER#${json.customerId}`,
      GSI1SK: `TXN#${createdAt}#${json.transactionId}`,
      GSI2PK: `MERCHANT#${json.merchantId}`,
      GSI2SK: `TXN#${createdAt}#${json.transactionId}`,
      GSI3PK: `IDEMPOTENCY#${json.idempotencyKey}`,
      GSI3SK: 'TXN',
      ...(json.locationId && {
        locationId: json.locationId,
        GSI5PK: `MERCHANT#${json.merchantId}#LOCATION#${json.locationId}`,
        GSI5SK: `TXN#${createdAt}#${json.transactionId}`,
      }),
      ...(json.amount != null && { amount: { amount: json.amount, currency: 'SAR' } }),
      ...(json.reversedTransactionId && { reversedTransactionId: json.reversedTransactionId }),
      ...(json.completedAt && { completedAt: json.completedAt }),
    };

    return item;
  }
}
