import { Campaign, NotFoundError, UnauthorizedError } from '../../domain';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem, QueryResult } from '../shared/interfaces/BaseRepository';

export interface ManageCampaignRequest {
  action: 'create' | 'list' | 'deactivate';
  merchantId: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  multiplier?: number;
  campaignId?: string;
}

export class ManageCampaignUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private campaignRepository: ICampaignRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
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
    }
  }

  private async create(request: ManageCampaignRequest): Promise<Campaign> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }
    if (!merchant.isVerified()) {
      throw new UnauthorizedError('Merchant is not verified');
    }

    if (!request.name) {
      throw new NotFoundError('Campaign', 'name is required');
    }
    if (!request.startDate || !request.endDate) {
      throw new NotFoundError('Campaign', 'startDate and endDate are required');
    }
    if (request.multiplier === undefined) {
      throw new NotFoundError('Campaign', 'multiplier is required');
    }

    const campaign = Campaign.create(
      request.merchantId,
      request.name,
      request.description ?? '',
      new Date(request.startDate),
      new Date(request.endDate),
      request.multiplier,
    );

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
    await this.atomicWrite(this.campaignRepository.toPersistenceItem(campaign));
    return undefined;
  }
}
