import type { IWebhookConfigRepository } from '../../application/repositories/IWebhookConfigRepository';
import { WebhookConfig, type WebhookConfigProps, type WebhookEventType } from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface WebhookConfigItem {
  PK: string;
  SK: string;
  EntityType: 'WEBHOOK_CONFIG';
  webhookId: string;
  merchantId: string;
  url: string;
  secretKey: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
}

export class WebhookConfigRepository
  extends BaseDynamoDBRepository<WebhookConfig>
  implements IWebhookConfigRepository
{
  async findByMerchant(merchantId: string): Promise<WebhookConfig[]> {
    const result = await this.query<WebhookConfigItem>({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `MERCHANT#${merchantId}`,
        ':prefix': 'WEBHOOK#',
      },
    });

    return result.items
      .map((item) => this.itemToEntity(item))
      .filter((config) => config.getIsActive());
  }

  async save(entity: WebhookConfig): Promise<void> {
    const items = this.toPersistenceItem(entity);
    for (const persistenceItem of items) {
      await this.putItem(persistenceItem.item);
    }
  }

  async delete(merchantId: string, webhookId: string): Promise<void> {
    await this.deleteItem(`MERCHANT#${merchantId}`, `WEBHOOK#${webhookId}`);
  }

  toPersistenceItem(entity: WebhookConfig) {
    return [
      {
        tableName: this.tableName,
        item: this.toItem(entity),
      },
    ];
  }

  protected toEntity(item: Record<string, unknown>): WebhookConfig {
    return this.itemToEntity(item as unknown as WebhookConfigItem);
  }

  private itemToEntity(item: WebhookConfigItem): WebhookConfig {
    const props: WebhookConfigProps = {
      webhookId: item.webhookId,
      merchantId: item.merchantId,
      url: item.url,
      secretKey: item.secretKey,
      events: item.events,
      isActive: item.isActive,
      createdAt: new Date(item.createdAt),
    };
    return WebhookConfig.reconstitute(props);
  }

  protected toItem(entity: WebhookConfig): Record<string, unknown> {
    const json = entity.toJSON();
    const item: WebhookConfigItem = {
      PK: `MERCHANT#${json.merchantId}`,
      SK: `WEBHOOK#${json.webhookId}`,
      EntityType: 'WEBHOOK_CONFIG',
      webhookId: json.webhookId,
      merchantId: json.merchantId,
      url: json.url,
      secretKey: entity.getSecretKey(),
      events: json.events,
      isActive: json.isActive,
      createdAt: json.createdAt,
    };
    return item as unknown as Record<string, unknown>;
  }

  // BaseRepository interface methods (not used directly for webhooks)
  async findById(_id: string): Promise<WebhookConfig | null> {
    return null;
  }

  async exists(_id: string): Promise<boolean> {
    return false;
  }
}
