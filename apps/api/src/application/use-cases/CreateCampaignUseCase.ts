import { Campaign, NotFoundError, UnauthorizedError } from '../../domain';
import type { CustomerTierLevel } from '../../domain/config/TierConfig';
import { CAMPAIGN_DEFAULTS, type CampaignType } from '../../domain/entities/Campaign';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ICampaignNotificationService } from '../services/ICampaignNotificationService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface CreateCampaignRequest {
  merchantId: string;
  type?: CampaignType | undefined;
  name?: string | undefined;
  description?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  multiplier?: number | undefined;
  message?: string | undefined;
  targetTiers?: string[] | undefined;
  maxUsesPerCustomer?: number | undefined;
  minPurchaseAmount?: number | undefined;
  maxPointsPerTransaction?: number | undefined;
  winBackDays?: number | undefined;
  welcomeDays?: number | undefined;
  lastVisitDays?: number | undefined;
  platformFilter?: 'ios' | 'android' | 'web' | undefined;
}

export class CreateCampaignUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private campaignRepository: ICampaignRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
    private notificationService?: ICampaignNotificationService | undefined,
  ) {}

  async execute(request: CreateCampaignRequest): Promise<Campaign> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }
    if (!merchant.isVerified()) {
      throw new UnauthorizedError('Merchant is not verified');
    }

    const type = request.type ?? 'CUSTOM';
    const overrides = buildCampaignOverrides(request);
    const campaign = Campaign.create(request.merchantId, type, overrides);

    // Auto-generate terms message if none provided
    campaign.setTermsMessage(campaign.generateTermsMessage());

    // Auto-create a linked perk on the merchant so the customer portal shows it
    const perkType = type !== 'CUSTOM' ? CAMPAIGN_DEFAULTS[type].perkType : 'SPEND_BONUS';
    const perk = merchant.addPerk({
      type: perkType,
      title: campaign.getName(),
      description: campaign.getDescription(),
      requiredTier: 'BRONZE' as CustomerTierLevel,
    });
    campaign.setLinkedPerkId(perk.id);

    // Atomically persist campaign + merchant (with new perk)
    await this.atomicWrite([
      ...this.campaignRepository.toPersistenceItem(campaign),
      ...this.merchantRepository.toPersistenceItem(merchant),
    ]);

    // Best-effort notification fan-out — must not fail campaign creation
    if (this.notificationService) {
      try {
        await this.notificationService.notifyCustomers(
          request.merchantId,
          merchant.getBusinessName(),
          campaign,
          request.platformFilter,
        );
      } catch {
        // Intentionally swallowed — campaign is already persisted
      }
    }

    return campaign;
  }
}

/** Build optional campaign override fields from a request object. */
export function buildCampaignOverrides(request: CreateCampaignRequest) {
  const overrides: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    multiplier?: number;
    message?: string;
    targetTiers?: string[];
    maxUsesPerCustomer?: number;
    minPurchaseAmount?: number;
    maxPointsPerTransaction?: number;
    winBackDays?: number;
    welcomeDays?: number;
    lastVisitDays?: number;
  } = {};
  if (request.name) overrides.name = request.name;
  if (request.description) overrides.description = request.description;
  if (request.startDate) overrides.startDate = new Date(request.startDate);
  if (request.endDate) overrides.endDate = new Date(request.endDate);
  if (request.multiplier !== undefined) overrides.multiplier = request.multiplier;
  if (request.message) overrides.message = request.message;
  if (request.targetTiers && request.targetTiers.length > 0) {
    overrides.targetTiers = request.targetTiers;
  }
  if (request.maxUsesPerCustomer !== undefined) {
    overrides.maxUsesPerCustomer = request.maxUsesPerCustomer;
  }
  if (request.minPurchaseAmount !== undefined) {
    overrides.minPurchaseAmount = request.minPurchaseAmount;
  }
  if (request.maxPointsPerTransaction !== undefined) {
    overrides.maxPointsPerTransaction = request.maxPointsPerTransaction;
  }
  if (request.winBackDays !== undefined) overrides.winBackDays = request.winBackDays;
  if (request.welcomeDays !== undefined) overrides.welcomeDays = request.welcomeDays;
  if (request.lastVisitDays !== undefined) overrides.lastVisitDays = request.lastVisitDays;
  return overrides;
}
