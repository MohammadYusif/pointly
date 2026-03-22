import { ConflictError, Customer, PhoneNumber, ValidationError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export interface CreateCustomerRequest {
  phone: string;
  name?: string | undefined;
}

export class CreateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(request: CreateCustomerRequest): Promise<ReturnType<Customer['toJSON']>> {
    let phone: PhoneNumber;
    try {
      phone = new PhoneNumber(request.phone);
    } catch {
      throw new ValidationError(
        'Invalid Saudi phone number format. Use 05XXXXXXXX or +9665XXXXXXXX',
      );
    }

    const existing = await this.customerRepository.findByPhone(phone.toE164());
    if (existing) {
      throw new ConflictError(
        `Customer with phone ${request.phone} already exists (ID: ${existing.getCustomerId()})`,
      );
    }

    const customer = Customer.create(phone, request.name);
    await this.customerRepository.save(customer);

    return customer.toJSON();
  }
}
