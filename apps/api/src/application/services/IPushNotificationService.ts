import type { PushSubscription } from '../../domain/entities/PushSubscription';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface IPushNotificationService {
  send(subscription: PushSubscription, payload: PushPayload): Promise<void>;
  sendBatch(subscriptions: PushSubscription[], payload: PushPayload): Promise<void>;
}
