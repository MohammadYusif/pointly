import { normalizePhone } from '@pointly/shared';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

const userPoolId = process.env.NEXT_PUBLIC_CUSTOMER_USER_POOL_ID || '';
const clientId = process.env.NEXT_PUBLIC_CUSTOMER_CLIENT_ID || '';

const poolData = { UserPoolId: userPoolId, ClientId: clientId };

function getUserPool(): CognitoUserPool | null {
  if (!userPoolId || !clientId) return null;
  return new CognitoUserPool(poolData);
}

export function signInWithPhone(rawPhone: string): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) return reject(new Error('Cognito not configured'));

    // Cognito requires E.164 (+966XXXXXXXXX) — normalize any local format
    const phone = normalizePhone(rawPhone);

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
    user.sendCustomChallengeAnswer(code.trim(), {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
      // Wrong OTP triggers another challenge instead of onFailure
      customChallenge: () => reject(new Error('Invalid OTP. Please try again.')),
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
          getIdToken: () => { getJwtToken: () => string };
        } | null,
      ) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session.getIdToken().getJwtToken());
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

export function signUpWithCognito(rawPhone: string, name?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) return reject(new Error('Cognito not configured'));

    const phone = normalizePhone(rawPhone);
    // Password is required by Cognito even for OTP-only flows; it is never used for login.
    const password = `Tmp${Date.now()}${Math.random().toString(36).slice(2)}Aa1!`;

    const attributes = [new CognitoUserAttribute({ Name: 'phone_number', Value: phone })];
    if (name) {
      attributes.push(new CognitoUserAttribute({ Name: 'name', Value: name }));
    }

    pool.signUp(phone, password, attributes, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
