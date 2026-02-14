import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

export interface TransactItem {
  tableName: string;
  item: Record<string, unknown>;
}

/**
 * Executes atomic DynamoDB TransactWriteItems across multiple tables.
 * Used by use cases that need to persist entities atomically (e.g., RecordPurchase).
 */
export class TransactionalWriter {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async writeAll(items: TransactItem[]): Promise<void> {
    if (items.length === 0) return;
    if (items.length > 100) {
      throw new Error('DynamoDB TransactWriteItems supports a maximum of 100 items');
    }

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: items.map((op) => ({
          Put: {
            TableName: op.tableName,
            Item: op.item,
          },
        })),
      }),
    );
  }
}
