'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ThermalReceipt } from '@/components/receipt/ThermalReceipt';
import { useMerchant, useRecordPurchase, useRegisterCustomer } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import { generateReceiptPDF } from '@/lib/receipt-pdf';
import type { MerchantScopedCustomerResponse, RecordPurchaseResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { getTierColor, normalizePhone } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { CheckCircle, Download, Printer, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Step = 'input' | 'confirming' | 'submitting' | 'receipt';

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step purchase flow with input/confirming/submitting/receipt states
export default function ManualEntryPage() {
  const { t, formatCurrency, formatNumber } = useTranslation();
  const { textStart } = useRTL();
  const { merchant } = useAuth();
  const { data: merchantData } = useMerchant();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('input');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [amount, setAmount] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [error, setError] = useState('');

  const locations = merchantData?.locations?.filter((l) => l.isActive) || [];
  const isMultiLocation = locations.length > 1;
  const [customer, setCustomer] = useState<MerchantScopedCustomerResponse | null>(null);
  const [result, setResult] = useState<RecordPurchaseResponse | null>(null);
  const purchaseMutation = useRecordPurchase();
  const registerMutation = useRegisterCustomer();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (!merchant) throw new Error('No merchant context');
      const normalized = normalizePhone(phone);
      if (!normalized) {
        setError(t('errors.invalidPhone'));
        return;
      }
      const result = await registerMutation.mutateAsync({
        merchantId: merchant.merchantId,
        phone: normalized,
      });
      setCustomer(result);
      setStep('confirming');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    }
  };

  const handleConfirm = async () => {
    if (!merchant || !customer) return;
    setStep('submitting');
    setError('');

    try {
      const purchaseResult = await purchaseMutation.mutateAsync({
        merchantId: merchant.merchantId,
        customerId: customer.customerId,
        amount: Number(amount),
        idempotencyKey: crypto.randomUUID(),
        locationId: selectedLocationId || undefined,
        metadata: cashierName ? { cashierName } : undefined,
      });
      setResult(purchaseResult);
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
      setStep('confirming');
    }
  };

  const handleNewTransaction = () => {
    setStep('input');
    setPhone('');
    setAmount('');
    setCashierName('');
    setSelectedLocationId('');
    setCustomer(null);
    setResult(null);
    setError('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!result || !customer || !merchant) return;
    await generateReceiptPDF({
      transactionId: result.transactionId,
      businessName: merchant.businessName,
      customerName: customer.name ?? '',
      customerPhone: customer.phone,
      amount: Number(amount),
      merchantPoints: result.merchantPoints,
      newMerchantBalance: result.newMerchantBalance,
      currentTier: result.currentTier,
      date: new Date(),
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('navigation.loyalty')}
        </h1>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Input Step */}
        {step === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('transaction.purchase')}</CardTitle>
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
                  <label htmlFor="amount-input" className="text-sm font-medium mb-1 block">
                    {t('transaction.amount')} (SAR)
                  </label>
                  <Input
                    id="amount-input"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0.01"
                    step="0.01"
                    dir="ltr"
                  />
                </div>
                {isMultiLocation && (
                  <div>
                    <label htmlFor="location-input" className="text-sm font-medium mb-1 block">
                      {t('merchant.locations')}
                    </label>
                    <select
                      id="location-input"
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">{t('merchant.selectLocation')}</option>
                      {locations.map((loc) => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                    {isMultiLocation && !selectedLocationId && (
                      <p className="text-xs text-destructive mt-1">
                        {t('errors.locationRequired')}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label htmlFor="cashier-input" className="text-sm font-medium mb-1 block">
                    {t('transaction.cashierName')} ({t('common.optional')})
                  </label>
                  <Input
                    id="cashier-input"
                    placeholder={t('transaction.cashierNamePlaceholder')}
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    registerMutation.isPending ||
                    !phone ||
                    !amount ||
                    (isMultiLocation && !selectedLocationId)
                  }
                >
                  {registerMutation.isPending ? t('common.loading') : t('common.next')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Step */}
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
                    {customer.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('customer.tier')}</span>
                  <span className={`font-medium ${getTierColor(customer.currentTier)}`}>
                    {customer.currentTier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('customer.points')}</span>
                  <span className="font-medium">
                    {formatNumber(customer.enrollment?.merchantPointsBalance ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('transaction.purchase')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('transaction.amount')}</span>
                  <span className="font-medium">{formatCurrency(Number(amount))}</span>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('input')}>
                {t('common.back')}
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        )}

        {/* Receipt Step */}
        {step === 'receipt' && result && customer && merchant && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <p className="text-lg font-bold text-green-600">
                    +{formatNumber(result.merchantPoints)} {t('common.points')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('transaction.purchaseSuccess')}
                  </p>
                  {result.tierUpgrade && (
                    <p className={`text-sm font-medium mt-1 ${getTierColor(result.currentTier)}`}>
                      {t('customer.tier')}: {result.currentTier}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {result.breakdown && (
              <Card>
                <CardContent className="py-4 space-y-2">
                  <p className="text-sm font-medium">{t('transaction.breakdown')}</p>
                  <div className="text-xs space-y-2">
                    {/* Calculation rows */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <span className="text-muted-foreground">
                        {t('transaction.breakdown_purchase')}
                      </span>
                      <span className="text-end font-medium">
                        {formatNumber(result.breakdown.purchaseAmount)} SAR
                      </span>

                      <span className="text-muted-foreground">
                        {t('transaction.breakdown_rate')}
                      </span>
                      <span className="text-end font-medium">
                        {result.breakdown.pointsPerSAR} {t('transaction.breakdown_ptPerSar')}
                      </span>

                      <span className="text-muted-foreground">
                        {t('transaction.breakdown_basePoints')}
                      </span>
                      <span className="text-end font-medium">
                        {formatNumber(result.breakdown.basePoints)}
                      </span>
                    </div>

                    <div className="border-t border-border/50" />

                    {/* Multipliers */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <span className="text-muted-foreground">
                        {t('transaction.breakdown_tier')}
                      </span>
                      <span className="text-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                          {result.breakdown.tierName} {result.breakdown.tierMultiplier}×
                        </span>
                      </span>
                      {result.breakdown.campaignName && (
                        <>
                          <span className="text-muted-foreground">
                            {t('transaction.breakdown_campaign')}
                          </span>
                          <span className="text-end">
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-medium">
                              {result.breakdown.campaignName} {result.breakdown.campaignMultiplier}×
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Bonus cap warning */}
                    {result.breakdown.bonusPointsCap !== undefined &&
                      result.breakdown.bonusPointsBeforeCap !== undefined && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-800 flex items-center justify-between">
                          <span>{t('transaction.breakdown_bonusCapped')}</span>
                          <span className="font-medium">
                            +{formatNumber(result.breakdown.bonusPointsCap)}
                            <span className="text-amber-600 ms-1">
                              ({t('transaction.breakdown_beforeCap')}: +
                              {formatNumber(result.breakdown.bonusPointsBeforeCap)})
                            </span>
                          </span>
                        </div>
                      )}

                    <div className="border-t border-border/50" />

                    {/* Final totals */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-medium text-foreground">
                      <span>{t('transaction.breakdown_merchant')}</span>
                      <span className="text-end text-green-600">
                        +{formatNumber(result.breakdown.finalMerchantPoints)}
                      </span>
                      <span>{t('transaction.breakdown_global')}</span>
                      <span className="text-end text-blue-600">
                        +{formatNumber(result.breakdown.finalGlobalPoints)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hidden printable receipt */}
            <div className="hidden print:block">
              <ThermalReceipt
                transactionId={result.transactionId}
                businessName={merchant.businessName}
                customerName={customer.name ?? ''}
                customerPhone={customer.phone}
                amount={Number(amount)}
                merchantPoints={result.merchantPoints}
                newMerchantBalance={result.newMerchantBalance}
                currentTier={result.currentTier}
                date={new Date()}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="h-4 w-4 me-2" />
                {t('transaction.printReceipt')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 me-2" />
                {t('transaction.downloadPdf')}
              </Button>
            </div>

            <Button className="w-full" onClick={handleNewTransaction}>
              <RotateCcw className="h-4 w-4 me-2" />
              {t('transaction.newPurchase')}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
