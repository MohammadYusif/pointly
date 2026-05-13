import { randomBytes } from 'node:crypto';
import { ConflictError, ValidationError } from '../../domain';
import { PLAN_PRICES, type PlanType } from '../../domain/config/PlanPrices';
import { PendingMerchantSignup } from '../../domain/entities/PendingMerchantSignup';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { IPendingSignupRepository } from '../repositories/IPendingSignupRepository';
import type { IPaymentService } from '../services/IPaymentService';

export interface InitiateSignupRequest {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  plan: PlanType;
  callbackUrl: string;
}

export interface InitiateSignupResponse {
  paymentUrl: string;
  signupId: string;
}

export class InitiateMerchantSignupUseCase {
  constructor(
    private readonly merchantRepository: IMerchantRepository,
    private readonly pendingSignupRepository: IPendingSignupRepository,
    private readonly paymentService: IPaymentService,
  ) {}

  async execute(request: InitiateSignupRequest): Promise<InitiateSignupResponse> {
    // Validate plan
    if (!PLAN_PRICES[request.plan]) {
      throw new ValidationError(`Invalid plan: ${request.plan}`);
    }

    // Check email uniqueness
    const existingByEmail = await this.merchantRepository.findByEmail(request.email);
    if (existingByEmail) {
      throw new ConflictError(`A merchant with email ${request.email} already exists`);
    }

    // Check phone uniqueness
    const existingByPhone = await this.merchantRepository.findByPhone(request.phone);
    if (existingByPhone) {
      throw new ConflictError(`A merchant with phone ${request.phone} already exists`);
    }

    // Generate a temporary password for Cognito (sent to merchant after payment)
    const tempPassword = `Tmp${randomBytes(6).toString('base64url')}!1`;

    // Create pending signup
    const signup = PendingMerchantSignup.create({
      businessName: request.businessName,
      email: request.email,
      phone: request.phone,
      contactName: request.contactName,
      tempPassword,
      plan: request.plan,
    });

    // Create Moyasar payment
    const amount = PLAN_PRICES[request.plan];
    const payment = await this.paymentService.createPayment({
      amount,
      currency: 'SAR',
      description: `Pointly ${request.plan} plan — ${request.businessName}`,
      callbackUrl: request.callbackUrl,
      metadata: {
        signupId: signup.getSignupId(),
        plan: request.plan,
      },
    });

    // Save payment ID on the signup and persist
    signup.setPaymentId(payment.paymentId);
    await this.pendingSignupRepository.save(signup);

    return {
      paymentUrl: payment.paymentUrl,
      signupId: signup.getSignupId(),
    };
  }
}
