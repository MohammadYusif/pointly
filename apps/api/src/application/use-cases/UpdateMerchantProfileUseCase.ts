import { NotFoundError, PhoneNumber, ValidationError } from '../../domain';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';

export interface WalletConfigInput {
  primaryColor: string;
  backgroundColor: string;
  logoUrl?: string | undefined;
}

export interface UpdateMerchantProfileRequest {
  merchantId: string;
  businessName?: string | undefined;
  contactName?: string | undefined;
  phone?: string | undefined;
  walletConfig?: WalletConfigInput | undefined;
}

export class UpdateMerchantProfileUseCase {
  constructor(private merchantRepository: IMerchantRepository) {}

  async execute(request: UpdateMerchantProfileRequest): Promise<unknown> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    const updates: { businessName?: string; contactName?: string; phone?: PhoneNumber } = {};
    if (request.businessName) updates.businessName = request.businessName;
    if (request.contactName) updates.contactName = request.contactName;
    if (request.phone) {
      try {
        updates.phone = new PhoneNumber(request.phone);
      } catch {
        throw new ValidationError('Invalid Saudi phone number format');
      }
    }

    merchant.updateBusinessInfo(updates);

    if (request.walletConfig) {
      const wc = request.walletConfig;
      merchant.setWalletConfig({
        primaryColor: wc.primaryColor,
        backgroundColor: wc.backgroundColor,
        ...(wc.logoUrl !== undefined && { logoUrl: wc.logoUrl }),
      });
    }

    await this.merchantRepository.save(merchant);

    return merchant.toJSON();
  }
}
