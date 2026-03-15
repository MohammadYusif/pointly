import type { ICampaignRepository } from '../../application/repositories/ICampaignRepository';
import type { QueryResult } from '../../application/shared/interfaces/BaseRepository';
import { Campaign, type CampaignProps } from '../../domain';
import { BaseDynamoDBRepository } from './BaseRepository';

interface CampaignItem {
  PK: string;
  SK: string;
  EntityType: 'CAMPAIGN';
  campaignId: string;
  merchantId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  isActive: boolean;
  createdAt: string;
}

export class CampaignRepository
  extends BaseDynamoDBRepository<Campaign>
  implements ICampaignRepository
{
  async findById(_id: string): Promise<Campaign | null> {
    // Campaigns are stored under MERCHANT# PK, so we can't find by ID alone
    // without knowing the merchant. This is a limitation of the single-table design.
    // For now, unused — campaigns are always queried by merchant.
    return null;
  }

  async findByMerchant(merchantId: string): Promise<QueryResult<Campaign>> {
    const result = await this.query<CampaignItem>({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `MERCHANT#${merchantId}`,
        ':prefix': 'CAMPAIGN#',
      },
    });

    return {
      items: result.items.map((item) => this.itemToEntity(item)),
      count: result.count,
      nextToken: result.nextToken,
    };
  }

  async findActiveCampaignsForMerchant(merchantId: string): Promise<Campaign[]> {
    const result = await this.findByMerchant(merchantId);
    return result.items.filter((campaign) => campaign.isActiveNow());
  }

  async save(entity: Campaign): Promise<void> {
    const items = this.toPersistenceItem(entity);
    for (const persistenceItem of items) {
      await this.putItem(persistenceItem.item);
    }
  }

  async delete(_id: string): Promise<void> {
    // Need merchantId to delete — handled via deactivation instead
    // This method is part of BaseRepository interface but not used for campaigns
  }

  async exists(_id: string): Promise<boolean> {
    return false;
  }

  toPersistenceItem(entity: Campaign) {
    return [
      {
        tableName: this.tableName,
        item: this.toItem(entity),
      },
    ];
  }

  protected toEntity(item: Record<string, unknown>): Campaign {
    return this.itemToEntity(item as unknown as CampaignItem);
  }

  private itemToEntity(item: CampaignItem): Campaign {
    const props: CampaignProps = {
      campaignId: item.campaignId,
      merchantId: item.merchantId,
      name: item.name,
      description: item.description,
      startDate: new Date(item.startDate),
      endDate: new Date(item.endDate),
      multiplier: item.multiplier,
      isActive: item.isActive,
      createdAt: new Date(item.createdAt),
    };
    return Campaign.reconstitute(props);
  }

  protected toItem(entity: Campaign): Record<string, unknown> {
    const json = entity.toJSON();
    const item: CampaignItem = {
      PK: `MERCHANT#${json.merchantId}`,
      SK: `CAMPAIGN#${json.campaignId}`,
      EntityType: 'CAMPAIGN',
      campaignId: json.campaignId,
      merchantId: json.merchantId,
      name: json.name,
      description: json.description,
      startDate: json.startDate,
      endDate: json.endDate,
      multiplier: json.multiplier,
      isActive: json.isActive,
      createdAt: json.createdAt,
    };
    return item as unknown as Record<string, unknown>;
  }

  async deactivateCampaign(merchantId: string, campaignId: string): Promise<void> {
    const item = await this.getItem<CampaignItem>(
      `MERCHANT#${merchantId}`,
      `CAMPAIGN#${campaignId}`,
    );
    if (!item) return;

    const campaign = this.itemToEntity(item);
    campaign.deactivate();
    await this.save(campaign);
  }
}
