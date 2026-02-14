'use client';

import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithPhone, confirmOtp } from '@/lib/auth';

export default function LoginPage() {
  const { t, language } = useTranslation();
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold" style={{ color: '#08b0a2' }}>
            Pointly
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {language === 'ar' ? 'بوابة العملاء' : 'Customer Portal'}
          </p>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('customer.phone')}</label>
                <Input
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !phone}>
                {loading ? t('common.loading') : t('common.next')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  dir="ltr"
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                {loading ? t('common.loading') : t('common.confirm')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>
                {t('common.back')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
