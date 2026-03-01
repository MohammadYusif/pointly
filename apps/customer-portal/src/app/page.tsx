'use client';

import { confirmOtp, signInWithPhone } from '@/lib/auth';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid">
        {/* ── Hero — desktop only ── */}
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

        {/* ── Form ── */}
        <div>
          <Card className="login-card">
            <CardHeader className="text-center pb-4">
              <div className="login-mobile-brand">
                <span style={{ color: '#08b0a2' }}>Pointly</span>
              </div>
              <CardTitle className="text-2xl font-bold" style={{ color: '#21242d' }}>
                {t('auth.welcomeBack')}
              </CardTitle>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                {t('auth.customerPortal')}
              </p>
            </CardHeader>

            <CardContent>
              {step === 'phone' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading || !phone}>
                    {loading ? t('common.loading') : t('common.next')}
                  </Button>
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
