import type { WebhookConfig } from '../../domain';

export interface IOutgoingWebhookService {
  /** Send a signed webhook payload. Fire-and-forget — never throws. */
  send(config: WebhookConfig, eventType: string, payload: Record<string, unknown>): Promise<void>;
}
