import type { Campaign } from '../../domain/entities/Campaign';
import { NotFoundError } from '../../domain/errors/DomainError';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';
import { type CreateCampaignRequest, buildCampaignOverrides } from './CreateCampaignUseCase';

export interface UpdateCampaignRequest
  extends Omit<CreateCampaignRequest, 'type' | 'platformFilter'> {
  campaignId: string;
}

export class UpdateCampaignUseCase {
  constructor(
    private campaignRepository: ICampaignRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: UpdateCampaignRequest): Promise<Campaign> {
    const result = await this.campaignRepository.findByMerchant(request.merchantId);
    const campaign = result.items.find((c) => c.getCampaignId() === request.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign', request.campaignId);
    }

    campaign.update(buildCampaignOverrides(request));
    await this.atomicWrite(this.campaignRepository.toPersistenceItem(campaign));

    return campaign;
  }
}
