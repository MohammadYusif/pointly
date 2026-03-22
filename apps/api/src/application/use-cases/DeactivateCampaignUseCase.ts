import { NotFoundError } from '../../domain';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface DeactivateCampaignRequest {
  merchantId: string;
  campaignId: string;
}

export class DeactivateCampaignUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private campaignRepository: ICampaignRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: DeactivateCampaignRequest): Promise<void> {
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
          await this.atomicWrite([
            ...this.campaignRepository.toPersistenceItem(campaign),
            ...this.merchantRepository.toPersistenceItem(merchant),
          ]);
          return;
        } catch {
          // Perk already removed — fall through to campaign-only save
        }
      }
    }

    await this.atomicWrite(this.campaignRepository.toPersistenceItem(campaign));
  }
}
