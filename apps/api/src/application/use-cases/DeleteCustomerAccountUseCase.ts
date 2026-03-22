import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ICognitoUserService } from '../services/ICognitoUserService';

export interface DeleteCustomerAccountRequest {
  customerId: string;
  /** Cognito username (phone) for pool deletion — optional if pool is not configured. */
  cognitoPhone?: string | undefined;
}

export class DeleteCustomerAccountUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private cognitoUserService: ICognitoUserService | null,
  ) {}

  async execute(request: DeleteCustomerAccountRequest): Promise<void> {
    // 1. Delete from DynamoDB (profile + merchant index items)
    await this.customerRepository.delete(request.customerId);

    // 2. Delete from Cognito if pool is configured and phone is available
    if (this.cognitoUserService && request.cognitoPhone) {
      await this.cognitoUserService.deleteUser(request.cognitoPhone);
    }
  }
}
