import { createHash } from 'node:crypto';
import { PushSubscription } from '../../domain/entities/PushSubscription';
import type { PlatformCounts } from '../repositories/IPushSubscriptionRepository';
import type { IPushSubscriptionRepository } from '../repositories/IPushSubscriptionRepository';

export interface SubscribeRequest {
  action: 'subscribe';
  customerId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: 'ios' | 'android' | 'web';
}

export interface UnsubscribeRequest {
  action: 'unsubscribe';
  customerId: string;
  endpoint: string;
}

export interface GetVapidKeyRequest {
  action: 'getVapidKey';
}

export interface GetPlatformStatsRequest {
  action: 'getPlatformStats';
  merchantId: string;
}

export type ManagePushSubscriptionRequest =
  | SubscribeRequest
  | UnsubscribeRequest
  | GetVapidKeyRequest
  | GetPlatformStatsRequest;

export class ManagePushSubscriptionUseCase {
  constructor(
    private pushSubscriptionRepository: IPushSubscriptionRepository,
    private vapidPublicKey: string | undefined,
  ) {}

  async execute(
    request: ManagePushSubscriptionRequest,
  ): Promise<PushSubscription | PlatformCounts | { publicKey: string | null } | undefined> {
    switch (request.action) {
      case 'subscribe':
        return this.subscribe(request);
      case 'unsubscribe':
        return this.unsubscribe(request);
      case 'getVapidKey':
        return this.getVapidKey();
      case 'getPlatformStats':
        return this.getPlatformStats(request);
    }
  }

  private async subscribe(request: SubscribeRequest): Promise<PushSubscription> {
    const sub = PushSubscription.create(request.customerId, {
      endpoint: request.endpoint,
      p256dhKey: request.p256dh,
      authKey: request.auth,
      platform: request.platform,
    });
    await this.pushSubscriptionRepository.save(sub);
    return sub;
  }

  private async unsubscribe(request: UnsubscribeRequest): Promise<undefined> {
    const hash = createHash('sha256').update(request.endpoint).digest('hex');
    await this.pushSubscriptionRepository.deleteByEndpointHash(request.customerId, hash);
    return undefined;
  }

  private getVapidKey(): { publicKey: string | null } {
    return { publicKey: this.vapidPublicKey ?? null };
  }

  private async getPlatformStats(request: GetPlatformStatsRequest): Promise<PlatformCounts> {
    return this.pushSubscriptionRepository.findPlatformCountsByMerchant(request.merchantId);
  }
}
