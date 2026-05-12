import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

export type { CognitoUser };

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

function getUserPool(): CognitoUserPool {
  if (!userPoolId || !clientId) {
    throw new Error(
      'Cognito is not configured. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID.',
    );
  }
  return new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
}

export interface MerchantInfo {
  merchantId: string;
  businessName: string;
  email: string;
  tier: string;
  sub: string;
}

function parseIdToken(session: CognitoUserSession): MerchantInfo {
  const payload = session.getIdToken().decodePayload();
  return {
    merchantId: payload['custom:merchantId'] || '',
    businessName: payload['custom:businessName'] || '',
    email: payload.email || '',
    tier: payload['custom:tier'] || 'BASIC',
    sub: payload.sub,
  };
}

export type SignInResult =
  | { session: CognitoUserSession; merchant: MerchantInfo; requiresNewPassword?: false }
  | { requiresNewPassword: true; cognitoUser: CognitoUser };

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({ session, merchant: parseIdToken(session) });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: (_userAttributes, _requiredAttributes) => {
        // AdminCreateUser sets users in FORCE_CHANGE_PASSWORD state
        resolve({ requiresNewPassword: true, cognitoUser });
      },
    });
  });
}

export function completeNewPassword(
  cognitoUser: CognitoUser,
  newPassword: string,
): Promise<{ session: CognitoUserSession; merchant: MerchantInfo }> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: (session) => {
          resolve({ session, merchant: parseIdToken(session) });
        },
        onFailure: (err) => {
          reject(err);
        },
      },
    );
  });
}

export function signOut(): void {
  const cognitoUser = getUserPool().getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  document.cookie = 'pointly-auth=; Max-Age=0; path=/';
}

export function getCurrentSession(): Promise<{
  session: CognitoUserSession;
  merchant: MerchantInfo;
} | null> {
  return new Promise((resolve) => {
    let cognitoUser: CognitoUser | null = null;
    try {
      cognitoUser = getUserPool().getCurrentUser();
    } catch {
      resolve(null);
      return;
    }
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve({ session, merchant: parseIdToken(session) });
    });
  });
}

export async function getAccessToken(): Promise<string | null> {
  const result = await getCurrentSession();
  if (!result) return null;
  // Use ID token — it contains custom:merchantId needed by the backend
  return result.session.getIdToken().getJwtToken();
}

export function setAuthCookie(): void {
  // 30-day cookie matching Cognito refresh token validity
  document.cookie = 'pointly-auth=1; Max-Age=2592000; path=/; SameSite=Lax';
}
