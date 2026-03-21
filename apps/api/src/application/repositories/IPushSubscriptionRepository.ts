import type { PushSubscription } from '../../domain/entities/PushSubscription';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface PlatformCounts {
  ios: number;
  android: number;
  web: number;
}

export interface IPushSubscriptionRepository {
  save(sub: PushSubscription): Promise<void>;
  findByCustomer(customerId: string): Promise<PushSubscription[]>;
  deleteByEndpointHash(customerId: string, endpointHash: string): Promise<void>;
  deleteSubscriptionWithMerchantIndexes(
    customerId: string,
    endpointHash: string,
    merchantIds: string[],
  ): Promise<void>;
  findPlatformCountsByMerchant(merchantId: string): Promise<PlatformCounts>;
  findByPlatform(
    merchantId: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<PushSubscription[]>;
  findAll(platform?: 'ios' | 'android' | 'web'): Promise<PushSubscription[]>;
  saveMerchantIndexRecords(
    merchantIds: string[],
    subscription: PushSubscription,
  ): PersistenceItem[];
  toPushSubscriptionPersistenceItem(subscription: PushSubscription): PersistenceItem;
}
