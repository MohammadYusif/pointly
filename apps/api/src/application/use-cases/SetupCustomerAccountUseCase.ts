import { Customer, PhoneNumber, ValidationError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export interface SetupCustomerAccountRequest {
  cognitoSub: string;
  cognitoPhone: string;
  name?: string | undefined;
  dateOfBirth?: string | undefined;
  smsMarketingOptIn?: boolean | undefined;
}

export interface SetupCustomerAccountResponse {
  customer: ReturnType<Customer['toJSON']>;
  created: boolean;
}

export class SetupCustomerAccountUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(request: SetupCustomerAccountRequest): Promise<SetupCustomerAccountResponse> {
    if (!request.cognitoSub) {
      throw new ValidationError('Not authenticated');
    }
    if (!request.cognitoPhone) {
      throw new ValidationError('Phone number not found in token');
    }

    // Idempotent — return existing profile if already set up
    const existing = await this.customerRepository.findById(request.cognitoSub);
    if (existing) {
      return { customer: existing.toJSON(), created: false };
    }

    const phone = new PhoneNumber(request.cognitoPhone);
    const customer = Customer.createWithId(
      request.cognitoSub,
      phone,
      request.name,
      request.dateOfBirth,
      request.smsMarketingOptIn ?? false,
    );
    await this.customerRepository.save(customer);

    return { customer: customer.toJSON(), created: true };
  }
}
