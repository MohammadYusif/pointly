import { NotFoundError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export interface UpdateCustomerProfileRequest {
  customerId: string;
  name?: string | undefined;
}

export class UpdateCustomerProfileUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(request: UpdateCustomerProfileRequest): Promise<unknown> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    if (request.name) {
      customer.updateName(request.name);
    }

    await this.customerRepository.save(customer);

    return customer.toJSON();
  }
}
