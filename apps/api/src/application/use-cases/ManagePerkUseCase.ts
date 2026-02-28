import { type CustomerTierLevel, NotFoundError } from '../../domain';
import type { Merchant, MerchantPerk, PerkType } from '../../domain/entities/Merchant';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface CreatePerkRequest {
  type: PerkType;
  title: string;
  description: string;
  requiredTier: CustomerTierLevel;
  capacityLimit?: number;
}

export interface UpdatePerkRequest {
  title?: string;
  description?: string;
  requiredTier?: CustomerTierLevel;
  capacityLimit?: number;
  isActive?: boolean;
}

/**
 * ManagePerkUseCase — Application-layer home for perk CRUD.
 *
 * Previously the perk routes called merchantRepository.save() directly from route handlers.
 * This use case provides the correct layering so that future additions (capacity tracking,
 * analytics events, notifications on new perks) live here rather than accumulating in handlers.
 */
export class ManagePerkUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async createPerk(merchantId: string, data: CreatePerkRequest): Promise<MerchantPerk> {
    const merchant = await this.findAndValidateMerchant(merchantId);
    const perk = merchant.addPerk(data);
    await this.atomicWrite(this.merchantRepository.toPersistenceItem(merchant));
    return perk;
  }

  async updatePerk(
    merchantId: string,
    perkId: string,
    data: UpdatePerkRequest,
  ): Promise<MerchantPerk> {
    const merchant = await this.findAndValidateMerchant(merchantId);
    merchant.updatePerk(perkId, data);
    await this.atomicWrite(this.merchantRepository.toPersistenceItem(merchant));
    const updated = merchant.getPerks().find((p) => p.id === perkId);
    if (!updated) {
      throw new NotFoundError('Perk', perkId);
    }
    return updated;
  }

  async deletePerk(merchantId: string, perkId: string): Promise<void> {
    const merchant = await this.findAndValidateMerchant(merchantId);
    merchant.removePerk(perkId);
    await this.atomicWrite(this.merchantRepository.toPersistenceItem(merchant));
  }

  private async findAndValidateMerchant(merchantId: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', merchantId);
    }
    return merchant;
  }
}
