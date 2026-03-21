import { createHash } from 'node:crypto';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type {
  IPushSubscriptionRepository,
  PlatformCounts,
} from '../../application/repositories/IPushSubscriptionRepository';
import type { PersistenceItem } from '../../application/shared/interfaces/BaseRepository';
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

interface MerchantPushIndexItem {
  PK: string;
  SK: string;
  EntityType: 'MERCHANT_PUSH_INDEX';
  pushId: string;
  customerId: string;
  merchantId: string;
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

  async deleteSubscriptionWithMerchantIndexes(
    customerId: string,
    endpointHash: string,
    merchantIds: string[],
  ): Promise<void> {
    const deleteOps: Array<{
      type: 'Delete';
      tableName?: string;
      key: { PK: string; SK: string };
    }> = [
      {
        type: 'Delete',
        key: { PK: `CUSTOMER#${customerId}`, SK: `PUSH#${endpointHash}` },
      },
      ...merchantIds.map((merchantId) => ({
        type: 'Delete' as const,
        key: {
          PK: `MERCHANT_PUSH#${merchantId}`,
          SK: `CUSTOMER#${customerId}#PUSH#${endpointHash}`,
        },
      })),
    ];

    await this.transactWrite(deleteOps);
  }

  toPushSubscriptionPersistenceItem(subscription: PushSubscription): PersistenceItem {
    return { tableName: this.tableName, item: this.toItem(subscription) };
  }

  saveMerchantIndexRecords(
    merchantIds: string[],
    subscription: PushSubscription,
  ): PersistenceItem[] {
    const endpointHash = PushSubscriptionRepository.endpointHash(subscription.endpoint);
    return merchantIds.map((merchantId) => {
      const item: MerchantPushIndexItem = {
        PK: `MERCHANT_PUSH#${merchantId}`,
        SK: `CUSTOMER#${subscription.customerId}#PUSH#${endpointHash}`,
        EntityType: 'MERCHANT_PUSH_INDEX',
        pushId: subscription.pushId,
        customerId: subscription.customerId,
        merchantId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.p256dhKey,
        authKey: subscription.authKey,
        platform: subscription.platform,
        createdAt: subscription.createdAt,
      };
      return { tableName: this.tableName, item: item as unknown as Record<string, unknown> };
    });
  }

  async findPlatformCountsByMerchant(merchantId: string): Promise<PlatformCounts> {
    const counts: PlatformCounts = { ios: 0, android: 0, web: 0 };
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': `MERCHANT_PUSH#${merchantId}` },
          ProjectionExpression: 'platform',
          ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
        }),
      );

      for (const rawItem of result.Items ?? []) {
        const platform = (rawItem as { platform?: string }).platform;
        if (platform === 'ios') counts.ios++;
        else if (platform === 'android') counts.android++;
        else if (platform === 'web') counts.web++;
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey !== undefined);

    return counts;
  }

  async findByPlatform(
    merchantId: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<PushSubscription[]> {
    const items: MerchantPushIndexItem[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          FilterExpression: 'platform = :platform',
          ExpressionAttributeValues: {
            ':pk': `MERCHANT_PUSH#${merchantId}`,
            ':platform': platform,
          },
          ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
        }),
      );

      for (const rawItem of result.Items ?? []) {
        items.push(rawItem as MerchantPushIndexItem);
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey !== undefined);

    return items.map((item) => this.itemToEntity(item));
  }

  async findAll(platform?: 'ios' | 'android' | 'web'): Promise<PushSubscription[]> {
    const hasFilter = platform !== undefined;
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: hasFilter
          ? 'EntityType = :et AND platform = :platform'
          : 'EntityType = :et',
        ExpressionAttributeValues: hasFilter
          ? { ':et': 'PUSH_SUBSCRIPTION', ':platform': platform }
          : { ':et': 'PUSH_SUBSCRIPTION' },
      }),
    );

    return (result.Items ?? []).map((item) =>
      this.itemToEntity(item as unknown as PushSubscriptionItem),
    );
  }

  protected toEntity(item: Record<string, unknown>): PushSubscription {
    return this.itemToEntity(item as unknown as PushSubscriptionItem);
  }

  private itemToEntity(item: PushSubscriptionItem | MerchantPushIndexItem): PushSubscription {
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
