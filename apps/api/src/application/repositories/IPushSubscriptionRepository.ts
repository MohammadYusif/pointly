import type { PushSubscription } from '../../domain/entities/PushSubscription';

export interface PlatformCounts {
  ios: number;
  android: number;
  web: number;
}

export interface IPushSubscriptionRepository {
  save(sub: PushSubscription): Promise<void>;
  findByCustomer(customerId: string): Promise<PushSubscription[]>;
  deleteByEndpointHash(customerId: string, endpointHash: string): Promise<void>;
  findPlatformCountsByMerchant(merchantId: string): Promise<PlatformCounts>;
  findByPlatform(
    merchantId: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<PushSubscription[]>;
}
