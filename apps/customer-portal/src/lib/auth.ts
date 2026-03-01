import { normalizePhone } from '@pointly/shared';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

const userPoolId = process.env.NEXT_PUBLIC_CUSTOMER_USER_POOL_ID || '';
const clientId = process.env.NEXT_PUBLIC_CUSTOMER_CLIENT_ID || '';

// Key stored in sessionStorage to remember which storage type was chosen at login.
// sessionStorage itself is tab-scoped and survives refresh within the same tab.
const STORAGE_TYPE_KEY = 'pointly-auth-storage';

function getUserPool(storage?: Storage): CognitoUserPool | null {
  if (!userPoolId || !clientId) return null;
  const opts: { UserPoolId: string; ClientId: string; Storage?: Storage } = {
    UserPoolId: userPoolId,
    ClientId: clientId,
  };
  if (storage) opts.Storage = storage;
  return new CognitoUserPool(opts);
}

/** Returns the storage that was chosen at login, falling back to localStorage. */
function getTokenStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const type = window.sessionStorage.getItem(STORAGE_TYPE_KEY);
    return type === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return window.localStorage;
  }
}

export function signInWithPhone(rawPhone: string, rememberMe = true): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Not in browser'));

    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    // Persist the choice so getCurrentSession knows where to look after a page refresh
    try {
      window.sessionStorage.setItem(STORAGE_TYPE_KEY, rememberMe ? 'local' : 'session');
    } catch {
      /* ignore */
    }

    const pool = getUserPool(storage);
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
    if (typeof window === 'undefined') return resolve(null);

    const storage = getTokenStorage();
    const pool = getUserPool(storage);
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
  if (typeof window === 'undefined') return;
  // Clear tokens from both storages so there are no leftover sessions
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const pool = getUserPool(storage);
    if (!pool) continue;
    const user = pool.getCurrentUser();
    if (user) user.signOut();
  }
  try {
    window.sessionStorage.removeItem(STORAGE_TYPE_KEY);
  } catch {
    /* ignore */
  }
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
