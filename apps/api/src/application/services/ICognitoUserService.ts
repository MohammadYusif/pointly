/**
 * ICognitoUserService
 *
 * Abstracts Cognito user management operations so use cases have no
 * direct dependency on the AWS Cognito SDK.
 */
export interface ICognitoUserService {
  /**
   * Permanently deletes a user from the Cognito User Pool.
   * @param username - The Cognito username (phone number for customer pool)
   */
  deleteUser(username: string): Promise<void>;
}
