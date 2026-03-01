'use client';

import { completeProfile } from '@/lib/api';
import { confirmOtp, signInWithPhone, signUpWithCognito } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  LanguageToggle,
  useRTL,
} from '@pointly/ui';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Ensures the user exists in Cognito, ignoring UsernameExistsException. */
async function ensureRegistered(phone: string, name?: string): Promise<void> {
  try {
    await signUpWithCognito(phone, name);
  } catch (err) {
    if (err instanceof Error && err.name === 'UsernameExistsException') return;
    throw err;
  }
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const router = useRouter();

  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ensureRegistered(phone, name || undefined);
      const user = await signInWithPhone(phone);
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
      await completeProfile({
        name: name || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
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
        {/* Hero — desktop only */}
        <div className={`login-hero ${textStart}`}>
          <div className="mb-8">
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#08b0a2' }}>
              Pointly
            </span>
          </div>

          <div className="login-badge">
            <span className="login-badge-dot" />
            {t('auth.platformBadge')}
          </div>

          <h1 className="login-headline">
            {t('auth.heroLine1')}
            <br />
            <span className="login-headline-accent">{t('auth.heroLine2')}</span>
          </h1>

          <p className="login-hero-sub">{t('auth.heroSubtitle')}</p>

          <div className="login-stats">
            <div>
              <span className="login-stat-value">50+</span>
              <span className="login-stat-label">{t('auth.stats.merchantsLabel')}</span>
            </div>
            <div>
              <span className="login-stat-value">4</span>
              <span className="login-stat-label">{t('auth.stats.tiersLabel')}</span>
            </div>
            <div>
              <span className="login-stat-value">12K+</span>
              <span className="login-stat-label">{t('auth.stats.customersLabel')}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div>
          <Card className="login-card">
            <CardHeader className="text-center pb-4">
              <div className="login-mobile-brand">
                <span style={{ color: '#08b0a2' }}>Pointly</span>
              </div>
              <CardTitle className="text-2xl font-bold" style={{ color: '#21242d' }}>
                {t('register.title')}
              </CardTitle>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                {step === 'info' ? t('register.subTitle') : t('register.otpStep')}
              </p>
            </CardHeader>

            <CardContent>
              {step === 'info' ? (
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="phone-input"
                      className="text-sm font-medium mb-1.5 block"
                      style={{ color: '#21242d' }}
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

                  <div>
                    <label
                      htmlFor="name-input"
                      className="text-sm font-medium mb-1.5 block"
                      style={{ color: '#21242d' }}
                    >
                      {t('register.nameLabel')}{' '}
                      <span style={{ color: '#71717a' }}>({t('common.optional')})</span>
                    </label>
                    <Input
                      id="name-input"
                      type="text"
                      placeholder={t('register.namePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dob-input"
                      className="text-sm font-medium mb-1.5 block"
                      style={{ color: '#21242d' }}
                    >
                      {t('register.dobLabel')}{' '}
                      <span style={{ color: '#71717a' }}>({t('common.optional')})</span>
                    </label>
                    <Input
                      id="dob-input"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-11"
                      dir="ltr"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button type="submit" className="w-full h-11" disabled={loading || !phone}>
                    {loading ? t('common.loading') : t('register.registerButton')}
                  </Button>

                  <p className="text-center text-sm" style={{ color: '#71717a' }}>
                    {t('register.haveAccount')}{' '}
                    <Link href="/" className="font-medium" style={{ color: '#08b0a2' }}>
                      {t('register.loginLink')}
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="otp-input"
                      className="text-sm font-medium mb-1.5 block"
                      style={{ color: '#21242d' }}
                    >
                      {t('auth.verificationCode')}
                    </label>
                    <p className="text-xs mb-3" style={{ color: '#71717a' }}>
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
                      setStep('info');
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
