import { createHash } from 'node:crypto';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import type {
  IPushSubscriptionRepository,
  PlatformCounts,
} from '../../application/repositories/IPushSubscriptionRepository';
import {
  PushSubscription,
  type PushSubscriptionProps,
} from '../../domain/entities/PushSubscription';
import { BaseDynamoDBRepository } from './BaseRepository';

interface PushSubscriptionItem {
  PK: string;
  SK: string;
  EntityType: 'PUSH_SUBSCRIPTION';
  pushId: string;
  customerId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
}

export class PushSubscriptionRepository
  extends BaseDynamoDBRepository<PushSubscription>
  implements IPushSubscriptionRepository
{
  static endpointHash(endpoint: string): string {
    return createHash('sha256').update(endpoint).digest('hex');
  }

  async save(sub: PushSubscription): Promise<void> {
    await this.putItem(this.toItem(sub));
  }

  async findByCustomer(customerId: string): Promise<PushSubscription[]> {
    const result = await this.query<PushSubscriptionItem>({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `CUSTOMER#${customerId}`,
        ':prefix': 'PUSH#',
      },
    });
    return result.items.map((item) => this.itemToEntity(item));
  }

  async deleteByEndpointHash(customerId: string, endpointHash: string): Promise<void> {
    await this.deleteItem(`CUSTOMER#${customerId}`, `PUSH#${endpointHash}`);
  }

  async findPlatformCountsByMerchant(_merchantId: string): Promise<PlatformCounts> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'EntityType = :et',
        ExpressionAttributeValues: { ':et': 'PUSH_SUBSCRIPTION' },
        ProjectionExpression: 'platform',
      }),
    );

    const counts: PlatformCounts = { ios: 0, android: 0, web: 0 };
    for (const rawItem of result.Items ?? []) {
      const platform = (rawItem as { platform?: string }).platform;
      if (platform === 'ios') counts.ios++;
      else if (platform === 'android') counts.android++;
      else if (platform === 'web') counts.web++;
    }
    return counts;
  }

  async findByPlatform(
    _merchantId: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<PushSubscription[]> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'EntityType = :et AND platform = :platform',
        ExpressionAttributeValues: {
          ':et': 'PUSH_SUBSCRIPTION',
          ':platform': platform,
        },
      }),
    );

    return (result.Items ?? []).map((item) => this.itemToEntity(item as unknown as PushSubscriptionItem));
  }

  protected toEntity(item: Record<string, unknown>): PushSubscription {
    return this.itemToEntity(item as unknown as PushSubscriptionItem);
  }

  private itemToEntity(item: PushSubscriptionItem): PushSubscription {
    const props: PushSubscriptionProps = {
      pushId: item.pushId,
      customerId: item.customerId,
      endpoint: item.endpoint,
      p256dhKey: item.p256dhKey,
      authKey: item.authKey,
      platform: item.platform,
      createdAt: item.createdAt,
    };
    return PushSubscription.reconstitute(props);
  }

  protected toItem(entity: PushSubscription): Record<string, unknown> {
    const hash = PushSubscriptionRepository.endpointHash(entity.endpoint);
    const item: PushSubscriptionItem = {
      PK: `CUSTOMER#${entity.customerId}`,
      SK: `PUSH#${hash}`,
      EntityType: 'PUSH_SUBSCRIPTION',
      pushId: entity.pushId,
      customerId: entity.customerId,
      endpoint: entity.endpoint,
      p256dhKey: entity.p256dhKey,
      authKey: entity.authKey,
      platform: entity.platform,
      createdAt: entity.createdAt,
    };
    return item as unknown as Record<string, unknown>;
  }
}
