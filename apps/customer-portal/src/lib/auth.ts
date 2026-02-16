import { AuthenticationDetails, CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js';

const userPoolId = process.env.NEXT_PUBLIC_CUSTOMER_USER_POOL_ID || '';
const clientId = process.env.NEXT_PUBLIC_CUSTOMER_CLIENT_ID || '';

const poolData = { UserPoolId: userPoolId, ClientId: clientId };

function getUserPool(): CognitoUserPool | null {
  if (!userPoolId || !clientId) return null;
  return new CognitoUserPool(poolData);
}

export function signInWithPhone(phone: string): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) return reject(new Error('Cognito not configured'));

    const user = new CognitoUser({ Username: phone, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: phone });

    user.setAuthenticationFlowType('CUSTOM_AUTH');
    user.initiateAuth(authDetails, {
      onSuccess: () => resolve(user),
      onFailure: (err) => reject(err),
      customChallenge: () => resolve(user),
    });
  });
}

export function confirmOtp(user: CognitoUser, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user.sendCustomChallengeAnswer(code, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function getCurrentSession(): Promise<string | null> {
  return new Promise((resolve) => {
    const pool = getUserPool();
    if (!pool) return resolve(null);

    const user = pool.getCurrentUser();
    if (!user) return resolve(null);

    user.getSession(
      (
        err: Error | null,
        session: {
          isValid: () => boolean;
          getAccessToken: () => { getJwtToken: () => string };
        } | null,
      ) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session.getAccessToken().getJwtToken());
      },
    );
  });
}

export function getAccessToken(): Promise<string | null> {
  return getCurrentSession();
}

export function signOut(): void {
  const pool = getUserPool();
  if (!pool) return;
  const user = pool.getCurrentUser();
  if (user) user.signOut();
}
