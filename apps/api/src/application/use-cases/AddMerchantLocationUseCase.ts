import { NotFoundError } from '../../domain';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';

export interface AddMerchantLocationRequest {
  merchantId: string;
  name: string;
  address: string;
  city: string;
}

export class AddMerchantLocationUseCase {
  constructor(private merchantRepository: IMerchantRepository) {}

  async execute(request: AddMerchantLocationRequest): Promise<unknown> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    const location = merchant.addLocation(request.name, request.address, request.city);
    await this.merchantRepository.save(merchant);

    return location;
  }
}
