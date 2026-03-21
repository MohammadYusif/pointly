import type { ICampaignRepository } from '../../application/repositories/ICampaignRepository';
import type { QueryResult } from '../../application/shared/interfaces/BaseRepository';
import { Campaign, type CampaignProps } from '../../domain';
import type { CampaignType } from '../../domain/entities/Campaign';
import { BaseDynamoDBRepository } from './BaseRepository';

interface CampaignItem {
  PK: string;
  SK: string;
  EntityType: 'CAMPAIGN';
  campaignId: string;
  merchantId: string;
  type: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  isActive: boolean;
  message?: string;
  linkedPerkId?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
  termsMessage?: string;
  winBackDays?: number;
  welcomeDays?: number;
  lastVisitDays?: number;
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
      type: item.type as CampaignType,
      name: item.name,
      description: item.description,
      startDate: new Date(item.startDate),
      endDate: new Date(item.endDate),
      multiplier: item.multiplier,
      isActive: item.isActive,
      createdAt: new Date(item.createdAt),
    };
    if (item.message) props.message = item.message;
    if (item.linkedPerkId) props.linkedPerkId = item.linkedPerkId;
    if (item.targetTiers) props.targetTiers = item.targetTiers;
    if (item.maxUsesPerCustomer) props.maxUsesPerCustomer = item.maxUsesPerCustomer;
    if (item.minPurchaseAmount) props.minPurchaseAmount = item.minPurchaseAmount;
    if (item.maxPointsPerTransaction) props.maxPointsPerTransaction = item.maxPointsPerTransaction;
    if (item.termsMessage) props.termsMessage = item.termsMessage;
    if (item.winBackDays) props.winBackDays = item.winBackDays;
    if (item.welcomeDays) props.welcomeDays = item.welcomeDays;
    if (item.lastVisitDays) props.lastVisitDays = item.lastVisitDays;
    return Campaign.reconstitute(props);
  }

  protected toItem(entity: Campaign): Record<string, unknown> {
    const item: CampaignItem = {
      PK: `MERCHANT#${entity.getMerchantId()}`,
      SK: `CAMPAIGN#${entity.getCampaignId()}`,
      EntityType: 'CAMPAIGN',
      campaignId: entity.getCampaignId(),
      merchantId: entity.getMerchantId(),
      type: entity.getType(),
      name: entity.getName(),
      description: entity.getDescription(),
      startDate: entity.getStartDate().toISOString(),
      endDate: entity.getEndDate().toISOString(),
      multiplier: entity.getMultiplier(),
      isActive: entity.getIsActive(),
      createdAt: entity.getCreatedAt().toISOString(),
    };
    const message = entity.getMessage();
    const linkedPerkId = entity.getLinkedPerkId();
    const targetTiers = entity.getTargetTiers();
    if (message) item.message = message;
    if (linkedPerkId) item.linkedPerkId = linkedPerkId;
    if (targetTiers && targetTiers.length > 0) item.targetTiers = targetTiers;
    const maxUses = entity.getMaxUsesPerCustomer();
    const minPurchase = entity.getMinPurchaseAmount();
    const maxPoints = entity.getMaxPointsPerTransaction();
    if (maxUses && maxUses > 0) item.maxUsesPerCustomer = maxUses;
    if (minPurchase && minPurchase > 0) item.minPurchaseAmount = minPurchase;
    if (maxPoints && maxPoints > 0) item.maxPointsPerTransaction = maxPoints;
    const termsMessage = entity.getTermsMessage();
    if (termsMessage) item.termsMessage = termsMessage;
    const winBackDays = entity.getWinBackDays();
    const welcomeDays = entity.getWelcomeDays();
    const lastVisitDays = entity.getLastVisitDays();
    if (winBackDays && winBackDays > 0) item.winBackDays = winBackDays;
    if (welcomeDays && welcomeDays > 0) item.welcomeDays = welcomeDays;
    if (lastVisitDays && lastVisitDays > 0) item.lastVisitDays = lastVisitDays;
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
