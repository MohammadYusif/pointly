import { ulid } from 'ulid';
import { ValidationError } from '../errors/DomainError';

export type WebhookEventType = 'REDEMPTION';

export const SUPPORTED_WEBHOOK_EVENTS: WebhookEventType[] = ['REDEMPTION'];

export interface WebhookConfigProps {
  webhookId: string;
  merchantId: string;
  url: string;
  secretKey: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
}

export class WebhookConfig {
  private constructor(private props: WebhookConfigProps) {}

  static create(
    merchantId: string,
    url: string,
    secretKey: string,
    events: WebhookEventType[],
  ): WebhookConfig {
    if (!url || url.trim().length === 0) {
      throw new ValidationError('Webhook URL is required');
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new ValidationError('Webhook URL must use HTTPS');
      }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError('Invalid webhook URL');
    }

    if (!secretKey || secretKey.length < 16) {
      throw new ValidationError('Secret key must be at least 16 characters');
    }

    if (events.length === 0) {
      throw new ValidationError('At least one event type is required');
    }

    for (const event of events) {
      if (!SUPPORTED_WEBHOOK_EVENTS.includes(event)) {
        throw new ValidationError(`Unsupported webhook event type: ${event}`);
      }
    }

    return new WebhookConfig({
      webhookId: ulid(),
      merchantId,
      url: url.trim(),
      secretKey,
      events,
      isActive: true,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: WebhookConfigProps): WebhookConfig {
    return new WebhookConfig(props);
  }

  // Getters
  getWebhookId(): string {
    return this.props.webhookId;
  }

  getMerchantId(): string {
    return this.props.merchantId;
  }

  getUrl(): string {
    return this.props.url;
  }

  getSecretKey(): string {
    return this.props.secretKey;
  }

  getEvents(): WebhookEventType[] {
    return [...this.props.events];
  }

  getIsActive(): boolean {
    return this.props.isActive;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  // Business logic
  supportsEvent(eventType: WebhookEventType): boolean {
    return this.props.isActive && this.props.events.includes(eventType);
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  // Serialization
  toJSON() {
    return {
      webhookId: this.props.webhookId,
      merchantId: this.props.merchantId,
      url: this.props.url,
      events: this.props.events,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
