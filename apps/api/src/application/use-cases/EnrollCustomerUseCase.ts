import { NotFoundError, Points, ValidationError } from '../../domain';
import type { CustomerEnrollment } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface EnrollCustomerRequest {
  customerId: string;
  merchantId: string;
  grantConsent?: boolean;
}

export interface EnrollCustomerResponse {
  customerId: string;
  merchantId: string;
  enrollment: CustomerEnrollment;
  welcomeBonusApplied: boolean;
}

/**
 * EnrollCustomerUseCase - Enroll a customer with a merchant
 *
 * Flow:
 * 1. Validate customer exists
 * 2. Validate merchant exists and is verified
 * 3. Enroll customer with merchant
 * 4. Optionally grant consent
 * 5. Apply welcome bonus if configured
 * 6. Increment merchant customer count
 * 7. Save everything atomically
 */
export class EnrollCustomerUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: EnrollCustomerRequest): Promise<EnrollCustomerResponse> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    if (!merchant.isVerified()) {
      throw new ValidationError('Merchant is not verified');
    }

    customer.enrollWithMerchant(request.merchantId);

    if (request.grantConsent) {
      customer.grantConsent(request.merchantId);
    }

    const loyaltyConfig = merchant.getLoyaltyConfig();
    let welcomeBonusApplied = false;

    if (loyaltyConfig.welcomeBonus > 0) {
      const bonusPoints = Points.from(loyaltyConfig.welcomeBonus);
      customer.applyWelcomeBonus(request.merchantId, bonusPoints, bonusPoints);
      welcomeBonusApplied = true;
    }

    merchant.incrementCustomerCount();

    const persistenceItems: PersistenceItem[] = [
      ...this.customerRepository.toPersistenceItem(customer),
      ...this.merchantRepository.toPersistenceItem(merchant),
    ];

    // Write the GSI2 index item only when consent is granted during enrollment.
    // This is the only time the index item is needed; purchase/redemption flows
    // must NOT include it to stay within DynamoDB's 25-item TransactWriteItems limit.
    if (request.grantConsent) {
      const indexItem = this.customerRepository.toMerchantIndexItem(customer, request.merchantId);
      if (indexItem) {
        persistenceItems.push(indexItem);
      }
    }

    await this.atomicWrite(persistenceItems);

    const enrollment = customer.getEnrollment(request.merchantId);
    if (!enrollment) {
      throw new ValidationError('Enrollment not found after enrolling — this should not happen');
    }

    return {
      customerId: request.customerId,
      merchantId: request.merchantId,
      enrollment,
      welcomeBonusApplied,
    };
  }
}
