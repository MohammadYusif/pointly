import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

export interface TransactItem {
  tableName: string;
  item: Record<string, unknown>;
}

/**
 * Hard limit imposed by the DynamoDB TransactWriteItems API.
 *
 * Item budget per use case (for reference):
 *   RecordPurchase  → 2 (txns) + 1 (merchant) + 1 (customer profile)    = 4 items
 *   RedeemPoints    → 1–2 (txns) + 1 (merchant) + 1 (customer profile)  = 3–4 items
 *   EnrollCustomer  → 1 (customer profile) + 1 (index) + 1 (merchant)   = 3 items
 *   ProcessDecay    → 1 (txn) + 1 (customer profile)                    = 2 items
 *
 * Keep toPersistenceItem (profile only) for purchase/redemption/decay,
 * and toEnrollmentItems (profile + index) exclusively during enrollment.
 */
export const TRANSACT_WRITE_MAX_ITEMS = 25;

/**
 * Executes atomic DynamoDB TransactWriteItems across multiple tables.
 * Used by use cases that need to persist entities atomically (e.g., RecordPurchase).
 */
export class TransactionalWriter {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async writeAll(items: TransactItem[]): Promise<void> {
    if (items.length === 0) return;
    if (items.length > TRANSACT_WRITE_MAX_ITEMS) {
      throw new Error(
        `DynamoDB TransactWriteItems supports a maximum of ${TRANSACT_WRITE_MAX_ITEMS} items, got ${items.length}. Use toPersistenceItem (profile only) for purchase/redemption/decay writes, and toEnrollmentItems only during consent-granting enrollment.`,
      );
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
