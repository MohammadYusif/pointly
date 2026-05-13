import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import type { QueryOptions, QueryResult } from '../../application/shared/interfaces/BaseRepository';

export abstract class BaseDynamoDBRepository<T> {
  constructor(
    protected readonly client: DynamoDBDocumentClient,
    protected readonly tableName: string,
  ) {}

  protected async getItem<R>(pk: string, sk: string): Promise<R | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      }),
    );

    return result.Item ? (result.Item as R) : null;
  }

  protected async putItem(item: object): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  protected async deleteItem(pk: string, sk: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      }),
    );
  }

  protected async query<R>(
    input: Omit<QueryCommandInput, 'TableName'>,
    options?: QueryOptions,
  ): Promise<QueryResult<R>> {
    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      ...input,
      Limit: options?.limit || 50,
      ScanIndexForward: options?.sortOrder !== 'DESC',
    };

    if (options?.nextToken) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(Buffer.from(options.nextToken, 'base64').toString());
      } catch {
        throw new Error('Invalid pagination token');
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed) ||
        !Object.keys(parsed as Record<string, unknown>).every(
          (k) => typeof (parsed as Record<string, unknown>)[k] === 'string',
        )
      ) {
        throw new Error('Invalid pagination token');
      }
      queryInput.ExclusiveStartKey = parsed as Record<string, string>;
    }

    const result = await this.client.send(new QueryCommand(queryInput));

    return {
      items: (result.Items || []) as R[],
      count: result.Count || 0,
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }

  protected async exists(pk: string, sk: string): Promise<boolean> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        ProjectionExpression: 'PK',
      }),
    );

    return !!result.Item;
  }

  /**
   * Execute a DynamoDB TransactWriteItems operation for atomic multi-item writes.
   * Accepts items across different tables by specifying tableName per item.
   *
   * @deprecated Use the `atomicWrite` callback injected via the use-case constructor instead.
   * This method bypasses the 25-item guard enforced by `TransactionalWriter.writeAll()` and
   * couples repository subclasses to transaction orchestration. Retained only for the
   * legacy `PushSubscriptionRepository` callsite — do not add new usages.
   */
  protected async transactWrite(
    items: Array<{
      type: 'Put' | 'Delete' | 'Update';
      tableName?: string;
      item?: object;
      key?: { PK: string; SK: string };
      updateExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, unknown>;
      conditionExpression?: string;
    }>,
  ): Promise<void> {
    const transactItems: TransactWriteCommandInput['TransactItems'] = items.map((op) => {
      const table = op.tableName || this.tableName;
      if (op.type === 'Put') {
        return {
          Put: {
            TableName: table,
            Item: op.item as Record<string, unknown>,
            ...(op.conditionExpression && { ConditionExpression: op.conditionExpression }),
          },
        };
      }
      if (op.type === 'Delete') {
        return {
          Delete: {
            TableName: table,
            Key: op.key as Record<string, unknown>,
            ...(op.conditionExpression && { ConditionExpression: op.conditionExpression }),
          },
        };
      }
      // Update
      return {
        Update: {
          TableName: table,
          Key: op.key as Record<string, unknown>,
          UpdateExpression: op.updateExpression ?? '',
          ...(op.expressionAttributeNames && {
            ExpressionAttributeNames: op.expressionAttributeNames,
          }),
          ...(op.expressionAttributeValues && {
            ExpressionAttributeValues: op.expressionAttributeValues,
          }),
          ...(op.conditionExpression && { ConditionExpression: op.conditionExpression }),
        },
      };
    });

    await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
  }

  // Abstract methods for entity conversion
  protected abstract toEntity(item: Record<string, unknown>): T;
  protected abstract toItem(entity: T): object;
}
