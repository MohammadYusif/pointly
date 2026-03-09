'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  type MerchantInfo,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getCurrentSession,
  setAuthCookie,
} from './auth';

interface AuthContextValue {
  merchant: MerchantInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getCurrentSession()
      .then((result) => {
        if (result) {
          setMerchant(result.merchant);
          setAuthCookie();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Client-side auth guard (replaces server middleware — not available with output: export)
  useEffect(() => {
    if (isLoading) return;
    const isLoginPage = pathname === '/login' || pathname === '/login/';
    if (!merchant && !isLoginPage) {
      router.replace('/login/');
    } else if (merchant && isLoginPage) {
      router.replace('/');
    }
  }, [isLoading, merchant, pathname, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await cognitoSignIn(email, password);
    setMerchant(result.merchant);
    setAuthCookie();
  }, []);

  const signOut = useCallback(() => {
    cognitoSignOut();
    setMerchant(null);
    window.location.href = '/login/';
  }, []);

  const value = useMemo(
    () => ({
      merchant,
      isAuthenticated: !!merchant,
      isLoading,
      signIn,
      signOut,
    }),
    [merchant, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
