import { createHmac } from 'node:crypto';
import type { IOutgoingWebhookService } from '../../application/services/IOutgoingWebhookService';
import type { WebhookConfig } from '../../domain';

export class OutgoingWebhookService implements IOutgoingWebhookService {
  /** Send a signed webhook payload. Fire-and-forget — never throws. */
  async send(
    config: WebhookConfig,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);

      // HMAC-SHA256 signature: timestamp.body
      const signaturePayload = `${timestamp}.${body}`;
      const signature = createHmac('sha256', config.getSecretKey())
        .update(signaturePayload)
        .digest('hex');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(config.getUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pointly-Signature': signature,
          'X-Pointly-Event': eventType,
          'X-Pointly-Timestamp': timestamp,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch {
      // Fire-and-forget: log but never throw
      // In production, this would log to CloudWatch
    }
  }
}
