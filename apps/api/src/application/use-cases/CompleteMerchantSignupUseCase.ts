import { Email, Merchant, MerchantTier, NotFoundError, PhoneNumber } from '../../domain';
import { logger } from '../../lib/logger';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { IPendingSignupRepository } from '../repositories/IPendingSignupRepository';
import type { ICognitoMerchantService } from '../services/ICognitoMerchantService';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { IPaymentService } from '../services/IPaymentService';

export interface CompleteSignupRequest {
  paymentId: string;
}

const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class CompleteMerchantSignupUseCase {
  constructor(
    private readonly pendingSignupRepository: IPendingSignupRepository,
    private readonly merchantRepository: IMerchantRepository,
    private readonly paymentService: IPaymentService,
    private readonly cognitoMerchantService: ICognitoMerchantService | null,
    private readonly idempotencyService: IIdempotencyService,
  ) {}

  async execute(request: CompleteSignupRequest): Promise<void> {
    // Idempotency check — prevent double processing if webhook fires twice
    const existing = await this.idempotencyService.getResult<boolean>(
      `merchant-signup:${request.paymentId}`,
    );
    if (existing) {
      logger.info('Duplicate merchant signup webhook ignored', {
        paymentId: request.paymentId,
      });
      return;
    }

    // Look up pending signup by paymentId
    const signup = await this.pendingSignupRepository.findByPaymentId(request.paymentId);
    if (!signup) {
      throw new NotFoundError('PendingSignup', request.paymentId);
    }

    if (signup.getStatus() === 'COMPLETED') {
      logger.info('Signup already completed', { signupId: signup.getSignupId() });
      return;
    }

    // Verify payment status with Moyasar
    const paymentStatus = await this.paymentService.getPaymentStatus(request.paymentId);
    if (paymentStatus !== 'paid') {
      signup.markFailed();
      await this.pendingSignupRepository.updateStatus(signup.getSignupId(), 'FAILED');
      logger.warn('Payment not confirmed', {
        paymentId: request.paymentId,
        status: paymentStatus,
      });
      return;
    }

    // Map plan to MerchantTier
    const tier = MerchantTier[signup.getPlan()];

    // Create Merchant entity
    const email = new Email(signup.getEmail());
    const phone = new PhoneNumber(signup.getPhone());
    const merchant = Merchant.create(
      signup.getBusinessName(),
      email,
      phone,
      signup.getContactName(),
      tier,
    );

    // Save merchant to DynamoDB
    await this.merchantRepository.save(merchant);

    // Create Cognito user (if service is configured)
    if (this.cognitoMerchantService) {
      await this.cognitoMerchantService.createUser({
        email: signup.getEmail(),
        temporaryPassword: signup.getHashedPassword(), // This is the temp password
        merchantId: merchant.getMerchantId(),
        businessName: signup.getBusinessName(),
        tier: signup.getPlan(),
      });
    }

    // Mark signup as completed
    signup.markCompleted();
    await this.pendingSignupRepository.updateStatus(signup.getSignupId(), 'COMPLETED');

    // Record idempotency key so webhook retries are skipped
    await this.idempotencyService.storeResult(
      `merchant-signup:${request.paymentId}`,
      true,
      IDEMPOTENCY_TTL_SECONDS,
    );

    logger.info('Merchant signup completed', {
      merchantId: merchant.getMerchantId(),
      signupId: signup.getSignupId(),
      plan: signup.getPlan(),
    });
  }
}
