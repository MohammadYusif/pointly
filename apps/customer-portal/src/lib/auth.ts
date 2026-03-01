import { normalizePhone } from '@pointly/shared';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

const userPoolId = process.env.NEXT_PUBLIC_CUSTOMER_USER_POOL_ID || '';
const clientId = process.env.NEXT_PUBLIC_CUSTOMER_CLIENT_ID || '';

// Stored in sessionStorage (tab-scoped, survives refresh) so getCurrentSession
// knows which storage to check first.
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

export function signInWithPhone(rawPhone: string, rememberMe = true): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Not in browser'));

    try {
      window.sessionStorage.setItem(STORAGE_TYPE_KEY, rememberMe ? 'local' : 'session');
    } catch {
      /* ignore */
    }

    // rememberMe=true  → use library default (StorageHelper → localStorage)
    // rememberMe=false → pass sessionStorage explicitly (cleared on tab close)
    const storage = rememberMe ? undefined : window.sessionStorage;
    const pool = getUserPool(storage);
    if (!pool) return reject(new Error('Cognito not configured'));

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

type CognitoSession = {
  isValid: () => boolean;
  getIdToken: () => { getJwtToken: () => string };
} | null;

export function getCurrentSession(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);

    const storedType = (() => {
      try {
        return window.sessionStorage.getItem(STORAGE_TYPE_KEY);
      } catch {
        return null;
      }
    })();

    // Try storages in priority order.
    // `undefined` = library default (StorageHelper → localStorage) — covers sessions
    // created by any previous version of this code.
    const storages: Array<Storage | undefined> =
      storedType === 'session'
        ? [window.sessionStorage, undefined, window.localStorage]
        : [undefined, window.localStorage, window.sessionStorage];

    const attempt = (i: number) => {
      if (i >= storages.length) return resolve(null);
      const pool = getUserPool(storages[i]);
      if (!pool) return resolve(null);
      const user = pool.getCurrentUser();
      if (!user) return attempt(i + 1);
      user.getSession((err: Error | null, session: CognitoSession) => {
        if (err || !session?.isValid()) return attempt(i + 1);
        resolve(session.getIdToken().getJwtToken());
      });
    };
    attempt(0);
  });
}

export function getAccessToken(): Promise<string | null> {
  return getCurrentSession();
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  // Sign out from every possible storage so there are no stale sessions.
  for (const storage of [undefined, window.localStorage, window.sessionStorage] as Array<
    Storage | undefined
  >) {
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
    // Password required by Cognito even for OTP-only flows; never used for login.
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
