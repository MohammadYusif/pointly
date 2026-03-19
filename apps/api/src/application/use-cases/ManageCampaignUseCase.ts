import { Campaign, NotFoundError, UnauthorizedError } from '../../domain';
import type { CustomerTierLevel } from '../../domain/config/TierConfig';
import { CAMPAIGN_DEFAULTS, type CampaignType } from '../../domain/entities/Campaign';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ISmsPublisherService, SmsMessage } from '../services/ISmsPublisherService';
import type { PersistenceItem, QueryResult } from '../shared/interfaces/BaseRepository';

export interface ManageCampaignRequest {
  action: 'create' | 'list' | 'deactivate' | 'update';
  merchantId: string;
  type?: CampaignType;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  multiplier?: number;
  message?: string;
  campaignId?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
}

export class ManageCampaignUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private campaignRepository: ICampaignRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
    private customerRepository?: ICustomerRepository,
    private smsPublisherService?: ISmsPublisherService,
  ) {}

  async execute(
    request: ManageCampaignRequest,
  ): Promise<Campaign | QueryResult<Campaign> | undefined> {
    switch (request.action) {
      case 'create':
        return this.create(request);
      case 'list':
        return this.list(request.merchantId);
      case 'deactivate':
        return this.deactivate(request);
      case 'update':
        return this.update(request);
    }
  }

  private static buildOverrides(request: ManageCampaignRequest) {
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
    return overrides;
  }

  private async create(request: ManageCampaignRequest): Promise<Campaign> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }
    if (!merchant.isVerified()) {
      throw new UnauthorizedError('Merchant is not verified');
    }

    const type = request.type ?? 'CUSTOM';
    const overrides = ManageCampaignUseCase.buildOverrides(request);
    const campaign = Campaign.create(request.merchantId, type, overrides);

    // Auto-generate terms message if merchant didn't provide one
    const termsMessage = campaign.generateTermsMessage();
    campaign.setTermsMessage(termsMessage);

    // Auto-create a linked perk on the merchant so the customer portal shows it
    const perkType = type !== 'CUSTOM' ? CAMPAIGN_DEFAULTS[type].perkType : 'SPEND_BONUS';

    const perk = merchant.addPerk({
      type: perkType,
      title: campaign.getName(),
      description: campaign.getDescription(),
      requiredTier: 'BRONZE' as CustomerTierLevel,
    });
    campaign.setLinkedPerkId(perk.id);

    // Atomically write both campaign + merchant (with new perk)
    const campaignItems = this.campaignRepository.toPersistenceItem(campaign);
    const merchantItems = this.merchantRepository.toPersistenceItem(merchant);
    await this.atomicWrite([...campaignItems, ...merchantItems]);

    // Fire-and-forget: notify all merchant customers about the new campaign
    try {
      await this.notifyCustomers(merchant.getBusinessName(), campaign);
    } catch {
      // SMS fan-out is best-effort — campaign creation must not fail
    }

    return campaign;
  }

  private async notifyCustomers(businessName: string, campaign: Campaign): Promise<void> {
    if (!this.customerRepository || !this.smsPublisherService) {
      return;
    }

    const result = await this.customerRepository.findByMerchant(campaign.getMerchantId(), {
      limit: 200,
    });

    if (result.items.length === 0) {
      return;
    }

    const endDate = campaign.getEndDate().toLocaleDateString('en-SA');
    const customMessage = campaign.getMessage();
    const defaultBody = `${businessName}: ${campaign.getName()} — earn ${campaign.getMultiplier()}x points! Valid until ${endDate}`;

    const messages: SmsMessage[] = result.items.map((customer) => ({
      phone: customer.getPhone().toE164(),
      body: customMessage ? `${businessName}: ${customMessage}` : defaultBody,
      merchantId: campaign.getMerchantId(),
      type: 'CAMPAIGN_NOTIFICATION' as const,
    }));

    await this.smsPublisherService.publishBatch(messages);
  }

  private async update(request: ManageCampaignRequest): Promise<Campaign> {
    if (!request.campaignId) {
      throw new NotFoundError('Campaign', 'campaignId is required');
    }
    const result = await this.campaignRepository.findByMerchant(request.merchantId);
    const campaign = result.items.find((c) => c.getCampaignId() === request.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign', request.campaignId);
    }

    const overrides = ManageCampaignUseCase.buildOverrides(request);
    campaign.update(overrides);

    await this.atomicWrite(this.campaignRepository.toPersistenceItem(campaign));
    return campaign;
  }

  private async list(merchantId: string): Promise<QueryResult<Campaign>> {
    return this.campaignRepository.findByMerchant(merchantId);
  }

  private async deactivate(request: ManageCampaignRequest): Promise<undefined> {
    if (!request.campaignId) {
      throw new NotFoundError('Campaign', 'campaignId is required');
    }

    const result = await this.campaignRepository.findByMerchant(request.merchantId);
    const campaign = result.items.find((c) => c.getCampaignId() === request.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign', request.campaignId);
    }

    campaign.deactivate();

    // Also deactivate the linked perk on the merchant
    const linkedPerkId = campaign.getLinkedPerkId();
    if (linkedPerkId) {
      const merchant = await this.merchantRepository.findById(request.merchantId);
      if (merchant) {
        try {
          merchant.removePerk(linkedPerkId);
          const campaignItems = this.campaignRepository.toPersistenceItem(campaign);
          const merchantItems = this.merchantRepository.toPersistenceItem(merchant);
          await this.atomicWrite([...campaignItems, ...merchantItems]);
          return undefined;
        } catch {
          // If perk already removed, just save the campaign
        }
      }
    }

    await this.atomicWrite(this.campaignRepository.toPersistenceItem(campaign));
    return undefined;
  }
}
