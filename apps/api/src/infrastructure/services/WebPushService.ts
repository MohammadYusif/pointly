import webpush from 'web-push';
import type {
  IPushNotificationService,
  PushPayload,
} from '../../application/services/IPushNotificationService';
import type { PushSubscription } from '../../domain/entities/PushSubscription';

export class WebPushService implements IPushNotificationService {
  private isConfigured: boolean;

  constructor(subject?: string, publicKey?: string, privateKey?: string) {
    if (subject && publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    if (!this.isConfigured) {
      console.warn('[WebPush] VAPID keys not configured — skipping push notification');
      return;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        },
        JSON.stringify(payload),
      );
    } catch (error) {
      console.error('[WebPush] Failed to send notification:', error);
    }
  }

  async sendBatch(subscriptions: PushSubscription[], payload: PushPayload): Promise<void> {
    for (const sub of subscriptions) {
      await this.send(sub, payload);
    }
  }
}
