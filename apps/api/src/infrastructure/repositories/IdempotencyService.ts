import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { IIdempotencyService } from '../../application/services/IIdempotencyService';

interface IdempotencyItem {
  PK: string;
  result: string;
  createdAt: string;
  TTL: number;
}

export class IdempotencyService implements IIdempotencyService {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getResult<T>(key: string): Promise<T | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `IDEMPOTENCY#${key}` },
      }),
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as IdempotencyItem;
    return JSON.parse(item.result) as T;
  }

  async storeResult<T>(key: string, result: T, ttlSeconds: number): Promise<void> {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + ttlSeconds;

    const item: IdempotencyItem = {
      PK: `IDEMPOTENCY#${key}`,
      result: JSON.stringify(result),
      createdAt: now.toISOString(),
      TTL: ttl,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `IDEMPOTENCY#${key}` },
      }),
    );
  }
}
