import type { Campaign } from '../../domain/entities/Campaign';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { QueryResult } from '../shared/interfaces/BaseRepository';

export class ListCampaignsUseCase {
  constructor(private campaignRepository: ICampaignRepository) {}

  async execute(merchantId: string): Promise<QueryResult<Campaign>> {
    return this.campaignRepository.findByMerchant(merchantId);
  }
}
