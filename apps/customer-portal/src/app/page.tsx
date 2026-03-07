'use client';

import { LoginHero } from '@/components/LoginHero';
import { PointlyLogo } from '@/components/PointlyLogo';
import { completeProfile } from '@/lib/api';
import { confirmOtp, getCurrentSession, signInWithPhone } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { isValidSaudiPhone } from '@pointly/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  LanguageToggle,
} from '@pointly/ui';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);

  // Redirect already-authenticated users to the dashboard,
  // UNLESS we were sent here because of an expired/invalid session (?expired=1).
  // That marker prevents the infinite loop: CustomerLayout → login → dashboard → repeat.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') return;
    getCurrentSession().then((token) => {
      if (token) router.replace('/dashboard');
    });
  }, [router]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSaudiPhone(phone)) {
      setError(t('errors.invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await signInWithPhone(phone, rememberMe);
      setCognitoUser(user);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cognitoUser) return;
    setError('');
    setLoading(true);
    try {
      await confirmOtp(cognitoUser, otp);
      // Ensure DynamoDB customer record exists (idempotent — safe to call on every login)
      await completeProfile({});
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />
      <div className="login-orb login-orb-4" aria-hidden="true" />

      <div className="login-lang-toggle">
        <LanguageToggle variant="ghost" showLabel={false} />
      </div>
      <div className="login-grid" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero — desktop only ── */}
        <LoginHero />

        {/* ── Form ── */}
        <div>
          <Card className="login-card">
            <CardHeader className="text-center pb-4">
              <div className="login-mobile-brand">
                <PointlyLogo height={26} />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {t('auth.welcomeBack')}
              </CardTitle>
              <p className="text-sm mt-1 text-muted-foreground">{t('auth.customerPortal')}</p>
            </CardHeader>

            <CardContent>
              {step === 'phone' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="phone-input"
                      className="text-sm font-medium mb-1.5 block text-foreground"
                    >
                      {t('customer.phone')}
                    </label>
                    <Input
                      id="phone-input"
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      dir="ltr"
                      className="h-11"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <label
                      htmlFor="remember-me"
                      className="text-sm cursor-pointer text-muted-foreground"
                    >
                      {t('auth.rememberMe')}
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading || !phone}>
                    {loading ? t('common.loading') : t('common.next')}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t('auth.noAccount')}{' '}
                    <Link href="/register" className="font-medium text-primary">
                      {t('auth.signUp')}
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="otp-input"
                      className="text-sm font-medium mb-1.5 block text-foreground"
                    >
                      {t('auth.verificationCode')}
                    </label>
                    <p className="text-xs mb-3 text-muted-foreground">
                      {t('auth.otpSentTo')} <span dir="ltr">{phone}</span>
                    </p>
                    <Input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      dir="ltr"
                      className="text-center text-2xl tracking-widest h-14"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? t('common.loading') : t('common.confirm')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError('');
                    }}
                  >
                    {t('common.back')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
