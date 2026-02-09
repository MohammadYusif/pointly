import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
});

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

export function signIn(
  email: string,
  password: string,
): Promise<{ session: CognitoUserSession; merchant: MerchantInfo }> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
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
    });
  });
}

export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
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
    const cognitoUser = userPool.getCurrentUser();
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
  return result.session.getAccessToken().getJwtToken();
}

export function setAuthCookie(): void {
  // 30-day cookie matching Cognito refresh token validity
  document.cookie = 'pointly-auth=1; Max-Age=2592000; path=/; SameSite=Lax';
}
