import { Customer, NotFoundError, PhoneNumber, ValidationError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface RegisterCustomerForMerchantRequest {
  merchantId: string;
  phone: string;
  name?: string | undefined;
}

export interface RegisterCustomerForMerchantResponse {
  customer: ReturnType<Customer['toMerchantScopedView']>;
  newlyCreated: boolean;
}

export class RegisterCustomerForMerchantUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(
    request: RegisterCustomerForMerchantRequest,
  ): Promise<RegisterCustomerForMerchantResponse> {
    let normalizedPhone: PhoneNumber;
    try {
      normalizedPhone = new PhoneNumber(request.phone);
    } catch {
      throw new ValidationError(
        'Invalid Saudi phone number format. Use 05XXXXXXXX or +9665XXXXXXXX',
      );
    }

    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    if (!merchant.isVerified()) {
      throw new ValidationError('Merchant is not verified');
    }

    // Find or create customer
    let customer = await this.customerRepository.findByPhone(normalizedPhone.toE164());
    let newlyCreated = false;

    if (!customer) {
      customer = Customer.create(normalizedPhone, request.name);
      newlyCreated = true;
    }

    // Enroll if not already enrolled (consent is auto-granted)
    const enrollment = customer.getEnrollment(request.merchantId);
    let customerChanged = newlyCreated;

    if (!enrollment) {
      customer.enrollWithMerchant(request.merchantId);
      merchant.incrementCustomerCount();
      customerChanged = true;
    }

    if (customerChanged) {
      await this.atomicWrite([
        ...this.customerRepository.toEnrollmentItems(customer, request.merchantId),
        ...this.merchantRepository.toPersistenceItem(merchant),
      ]);
    }

    return {
      customer: customer.toMerchantScopedView(request.merchantId),
      newlyCreated,
    };
  }
}
