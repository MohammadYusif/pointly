import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
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
      queryInput.ExclusiveStartKey = JSON.parse(
        Buffer.from(options.nextToken, 'base64').toString(),
      );
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

  // Abstract methods for entity conversion
  protected abstract toEntity(item: Record<string, unknown>): T;
  protected abstract toItem(entity: T): object;
}
