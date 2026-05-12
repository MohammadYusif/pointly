import {
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type {
  CreateMerchantUserParams,
  ICognitoMerchantService,
} from '../../application/services/ICognitoMerchantService';

/**
 * CognitoMerchantService
 *
 * Creates merchant users in the merchant Cognito User Pool with
 * a temporary password and custom attributes (merchantId, businessName, tier).
 * The user will be in FORCE_CHANGE_PASSWORD state after creation.
 */
export class CognitoMerchantService implements ICognitoMerchantService {
  private client: CognitoIdentityProviderClient;

  constructor(
    private userPoolId: string,
    region: string,
  ) {
    this.client = new CognitoIdentityProviderClient({ region });
  }

  async createUser(params: CreateMerchantUserParams): Promise<void> {
    // Create the user with a temporary password
    await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: params.email,
        TemporaryPassword: params.temporaryPassword,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: params.businessName },
          { Name: 'custom:merchantId', Value: params.merchantId },
          { Name: 'custom:businessName', Value: params.businessName },
          { Name: 'custom:tier', Value: params.tier },
        ],
        // Suppress the default welcome email — we send our own
        MessageAction: 'SUPPRESS',
      }),
    );

    // Ensure custom attributes are set (AdminCreateUser may skip mutable-only attrs)
    await this.client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: params.email,
        UserAttributes: [
          { Name: 'custom:merchantId', Value: params.merchantId },
          { Name: 'custom:businessName', Value: params.businessName },
          { Name: 'custom:tier', Value: params.tier },
        ],
      }),
    );
  }
}
