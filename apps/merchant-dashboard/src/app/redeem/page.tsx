'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchant, useRedeemPoints } from '@/hooks/api';
import { customerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CustomerResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Step = 'input' | 'confirming' | 'processing' | 'receipt';

interface RedeemResult {
  transactionIds: string[];
  merchantPointsRedeemed: number;
  globalPointsRedeemed: number;
  totalPointsRedeemed: number;
  sarValue: number;
  newMerchantBalance: number;
  newGlobalBalance: number;
  currentTier: string;
  message: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step form with 4 states requires conditional rendering
export default function RedeemPage() {
  const { t, formatNumber, formatCurrency, language } = useTranslation();
  const { textStart } = useRTL();
  const { merchant } = useAuth();
  const { data: merchantData } = useMerchant();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('input');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const redeemMutation = useRedeemPoints();
  const loyaltyConfig = merchantData?.loyaltyConfig;
  const minimumRedemption = loyaltyConfig?.minimumRedemption ?? 100;
  const redemptionRate = loyaltyConfig?.redemptionRate ?? 0.01;
  const allowPartial = loyaltyConfig?.allowPartialRedemption ?? true;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLookingUp(true);

    try {
      const foundCustomer = await customerApi.getByPhone(phone);
      setCustomer(foundCustomer);
      setStep('confirming');
    } catch {
      setError(t('errors.notFound'));
    } finally {
      setIsLookingUp(false);
    }
  };

  const getCustomerMerchantBalance = (): number => {
    if (!customer || !merchant) return 0;
    // biome-ignore lint/suspicious/noExplicitAny: enrollment shape varies
    const enrollment = customer.enrollments?.find((e: any) => e.merchantId === merchant.merchantId);
    return enrollment?.merchantPointsBalance ?? 0;
  };

  const getCustomerGlobalBalance = (): number => {
    return customer?.globalPointsBalance ?? 0;
  };

  const getTotalAvailable = (): number => {
    return getCustomerMerchantBalance() + getCustomerGlobalBalance();
  };

  const getRedemptionBreakdown = () => {
    const points = Number(pointsToRedeem);
    const merchantBal = getCustomerMerchantBalance();
    const merchantUsed = Math.min(points, merchantBal);
    const globalUsed = points - merchantUsed;
    return { merchantUsed, globalUsed };
  };

  const handleConfirm = async () => {
    if (!merchant || !customer) return;
    setStep('processing');
    setError('');

    try {
      const redeemResult = await redeemMutation.mutateAsync({
        merchantId: merchant.merchantId,
        customerId: customer.customerId,
        pointsToRedeem: Number(pointsToRedeem),
        idempotencyKey: crypto.randomUUID(),
      });
      setResult(redeemResult);
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
      setStep('confirming');
    }
  };

  const handleNewRedemption = () => {
    setStep('input');
    setPhone('');
    setPointsToRedeem('');
    setCustomer(null);
    setResult(null);
    setError('');
  };

  const sarValue = Number(pointsToRedeem) * redemptionRate;
  const { merchantUsed, globalUsed } = getRedemptionBreakdown();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('redeem.title')}
        </h1>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Step 1: Input */}
        {step === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('redeem.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label htmlFor="phone-input" className="text-sm font-medium mb-1 block">
                    {t('customer.phone')}
                  </label>
                  <Input
                    id="phone-input"
                    type="tel"
                    placeholder="+966 5XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <div>
                  <label htmlFor="points-input" className="text-sm font-medium mb-1 block">
                    {t('redeem.pointsToRedeem')}
                  </label>
                  <Input
                    id="points-input"
                    type="number"
                    placeholder={String(minimumRedemption)}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(e.target.value)}
                    required
                    min={minimumRedemption}
                    step={allowPartial ? '1' : String(minimumRedemption)}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {allowPartial
                      ? t('redeem.minRedemption', { min: String(minimumRedemption) })
                      : language === 'ar'
                        ? `يجب أن تكون النقاط مضاعفات ${minimumRedemption}`
                        : `Points must be in multiples of ${minimumRedemption}`}
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLookingUp || !phone || !pointsToRedeem}
                >
                  {isLookingUp ? t('common.loading') : t('common.next')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirming */}
        {step === 'confirming' && customer && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('customer.customerDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('customer.name')}</span>
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('customer.phone')}</span>
                  <span className="font-medium" dir="ltr">
                    {formatPhone(customer.phone)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('redeem.currentBalances')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.merchantBalance')}</span>
                  <span className="font-medium">{formatNumber(getCustomerMerchantBalance())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.globalBalance')}</span>
                  <span className="font-medium">{formatNumber(getCustomerGlobalBalance())}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-medium">
                    {language === 'ar' ? 'الإجمالي المتاح' : 'Total Available'}
                  </span>
                  <span className="font-bold">{formatNumber(getTotalAvailable())}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('redeem.redemptionBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.merchantPointsUsed')}</span>
                  <span className="font-medium">{formatNumber(merchantUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.globalPointsUsed')}</span>
                  <span className="font-medium">{formatNumber(globalUsed)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-medium">{t('redeem.sarValue')}</span>
                  <span className="font-bold text-green-600">{formatCurrency(sarValue)}</span>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('input')}>
                {t('common.back')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={Number(pointsToRedeem) > getTotalAvailable()}
              >
                {t('redeem.confirmRedemption')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Receipt */}
        {step === 'receipt' && result && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <p className="text-lg font-bold text-green-600">{t('redeem.success')}</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(result.sarValue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('redeem.newBalances')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.merchantBalance')}</span>
                  <span className="font-medium">{formatNumber(result.newMerchantBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('redeem.globalBalance')}</span>
                  <span className="font-medium">{formatNumber(result.newGlobalBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('customer.tier')}</span>
                  <span className="font-medium">{result.currentTier}</span>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleNewRedemption}>
              <RotateCcw className="h-4 w-4 me-2" />
              {language === 'ar' ? 'استبدال جديد' : 'New Redemption'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
