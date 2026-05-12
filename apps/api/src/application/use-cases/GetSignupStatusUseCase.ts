import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { IPendingSignupRepository } from '../repositories/IPendingSignupRepository';

export interface SignupStatusResponse {
  status: 'pending' | 'active' | 'failed';
}

export class GetSignupStatusUseCase {
  constructor(
    private readonly pendingSignupRepository: IPendingSignupRepository,
    private readonly merchantRepository: IMerchantRepository,
  ) {}

  async execute(paymentId: string): Promise<SignupStatusResponse> {
    const signup = await this.pendingSignupRepository.findByPaymentId(paymentId);

    if (!signup) {
      return { status: 'pending' }; // Not found yet — webhook may not have arrived
    }

    if (signup.getStatus() === 'COMPLETED') {
      // Double-check merchant actually exists
      const merchant = await this.merchantRepository.findByEmail(signup.getEmail());
      if (merchant) {
        return { status: 'active' };
      }
      // Merchant record missing despite COMPLETED status — edge case
      return { status: 'pending' };
    }

    if (signup.getStatus() === 'FAILED') {
      return { status: 'failed' };
    }

    // Still PENDING_PAYMENT
    return { status: 'pending' };
  }
}
