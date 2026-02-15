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
          PK: `NONCE#${nonce.nonce}`,
          SK: 'QR',
          customerId: nonce.customerId,
          expiresAt: nonce.expiresAt,
          used: nonce.used,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  }

  async findByNonce(nonce: string): Promise<QRNonce | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `NONCE#${nonce}`, SK: 'QR' },
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
        Key: { PK: `NONCE#${nonce}`, SK: 'QR' },
        UpdateExpression: 'SET used = :used',
        ExpressionAttributeValues: { ':used': true },
      }),
    );
  }
}
