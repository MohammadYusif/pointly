import type { PendingMerchantSignup } from '../../domain/entities/PendingMerchantSignup';

export interface IPendingSignupRepository {
  save(signup: PendingMerchantSignup): Promise<void>;
  findBySignupId(signupId: string): Promise<PendingMerchantSignup | null>;
  findByPaymentId(paymentId: string): Promise<PendingMerchantSignup | null>;
  updateStatus(
    signupId: string,
    status: 'COMPLETED' | 'FAILED',
    paymentId?: string | undefined,
  ): Promise<void>;
}
