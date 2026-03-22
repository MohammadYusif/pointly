import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { ICognitoUserService } from '../../application/services/ICognitoUserService';

/**
 * CognitoUserService
 *
 * Wraps the AWS Cognito AdminDeleteUser API so use cases remain free of
 * SDK dependencies. Used by DeleteCustomerAccountUseCase.
 */
export class CognitoUserService implements ICognitoUserService {
  private client: CognitoIdentityProviderClient;

  constructor(
    private userPoolId: string,
    region: string,
  ) {
    this.client = new CognitoIdentityProviderClient({ region });
  }

  async deleteUser(username: string): Promise<void> {
    await this.client.send(
      new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }),
    );
  }
}
