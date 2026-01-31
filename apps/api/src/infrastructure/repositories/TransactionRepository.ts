import type {
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
      ...(json.amount && { amount: json.amount }),
      ...(json.reversedTransactionId && { reversedTransactionId: json.reversedTransactionId }),
      ...(json.completedAt && { completedAt: json.completedAt }),
    };

    return item;
  }
}
