import type { WebhookConfig } from '../../domain';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface IWebhookConfigRepository {
  findByMerchant(merchantId: string): Promise<WebhookConfig[]>;
  save(entity: WebhookConfig): Promise<void>;
  delete(merchantId: string, webhookId: string): Promise<void>;
  toPersistenceItem(entity: WebhookConfig): PersistenceItem[];
}
