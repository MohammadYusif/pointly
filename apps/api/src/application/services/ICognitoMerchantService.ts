export interface CreateMerchantUserParams {
  email: string;
  temporaryPassword: string;
  merchantId: string;
  businessName: string;
  tier: string;
}

export interface ICognitoMerchantService {
  /** Create a merchant user in Cognito with a temporary password and custom attributes. */
  createUser(params: CreateMerchantUserParams): Promise<void>;
}
