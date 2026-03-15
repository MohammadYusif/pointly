import type { Campaign } from '../../domain';
import type { BaseRepository, QueryResult } from '../shared/interfaces/BaseRepository';

export interface ICampaignRepository extends BaseRepository<Campaign> {
  findByMerchant(merchantId: string): Promise<QueryResult<Campaign>>;
  findActiveCampaignsForMerchant(merchantId: string): Promise<Campaign[]>;
}
