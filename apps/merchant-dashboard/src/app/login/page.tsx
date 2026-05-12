'use client';

import { Logo } from '@/components/Logo';
import type { CognitoUser } from '@/lib/auth';
import { completeNewPassword, setAuthCookie } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { EASE } from '@/lib/utils';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LoginStep = 'credentials' | 'newPassword';

export default function LoginPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [pendingCognitoUser, setPendingCognitoUser] = useState<CognitoUser | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err) {
      if (err instanceof Error && err.message === 'NEW_PASSWORD_REQUIRED') {
        const typed = err as Error & { cognitoUser: CognitoUser };
        setPendingCognitoUser(typed.cognitoUser);
        setStep('newPassword');
      } else {
        setError(err instanceof Error ? err.message : t('errors.serverError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (!pendingCognitoUser) return;

    setIsLoading(true);
    try {
      await completeNewPassword(pendingCognitoUser, newPassword);
      setAuthCookie();
      // Full reload so AuthProvider picks up the new session
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper min-h-screen flex items-center justify-center px-4">
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />
      <div className="login-orb login-orb-4" aria-hidden="true" />
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
      >
        <Card className="w-full">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo width={140} />
            </div>
            <CardTitle className="text-2xl">
              {step === 'newPassword' ? t('auth.setNewPassword') : t('auth.signIn')}
            </CardTitle>
            {step === 'newPassword' && (
              <p className={`text-sm text-muted-foreground ${textStart}`}>
                {t('auth.setNewPasswordHint')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder={t('auth.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && <p className={`text-sm text-destructive ${textStart}`}>{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('common.loading') : t('auth.signIn')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder={t('auth.newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder={t('auth.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && <p className={`text-sm text-destructive ${textStart}`}>{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('common.loading') : t('auth.setNewPassword')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
