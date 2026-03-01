import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type {
  IQRNonceRepository,
  QRNonce,
} from '../../application/repositories/IQRNonceRepository';

export class QRNonceRepository implements IQRNonceRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(nonce: QRNonce): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          jti: nonce.nonce,
          customerId: nonce.customerId,
          expiresAt: nonce.expiresAt,
          used: nonce.used,
          ttl: nonce.expiresAt,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(jti)',
      }),
    );
  }

  async findByNonce(nonce: string): Promise<QRNonce | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { jti: nonce },
      }),
    );

    if (!result.Item) return null;

    const item = result.Item;
    return {
      nonce,
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
      customerId: item['customerId'] as string,
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
      expiresAt: item['expiresAt'] as number,
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
      used: item['used'] as boolean,
    };
  }

  async markUsed(nonce: string): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { jti: nonce },
        UpdateExpression: 'SET used = :used',
        ExpressionAttributeValues: { ':used': true },
      }),
    );
  }
}
