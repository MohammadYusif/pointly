'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ThermalReceipt } from '@/components/receipt/ThermalReceipt';
import { useMerchant, useRecordPurchase } from '@/hooks/api';
import { customerApi, normalizePhone } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { generateReceiptPDF } from '@/lib/receipt-pdf';
import type { CustomerResponse, RecordPurchaseResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { getTierColor } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { CheckCircle, Download, Printer, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Step = 'input' | 'confirming' | 'submitting' | 'receipt';

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
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [result, setResult] = useState<RecordPurchaseResponse | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const purchaseMutation = useRecordPurchase();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: lookup flow with QR parsing, phone validation, and error handling
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLookingUp(true);

    const normalizedPhone = normalizePhone(phone);

    try {
      // Try to find existing customer
      const foundCustomer = await customerApi.getByPhone(normalizedPhone);
      setCustomer(foundCustomer);

      // Check if enrolled with this merchant, if not auto-enroll
      if (merchant) {
        const enrollment = foundCustomer.enrollments?.find(
          (en: { merchantId: string }) => en.merchantId === merchant.merchantId,
        );
        if (!enrollment) {
          await customerApi.enroll(foundCustomer.customerId, merchant.merchantId);
          await customerApi.grantConsent(foundCustomer.customerId, merchant.merchantId);
          // Re-fetch to get updated enrollment data
          const updated = await customerApi.getByPhone(normalizedPhone);
          setCustomer(updated);
        } else if (enrollment.consentStatus !== 'GRANTED') {
          await customerApi.grantConsent(foundCustomer.customerId, merchant.merchantId);
          const updated = await customerApi.getByPhone(normalizedPhone);
          setCustomer(updated);
        }
      }

      setStep('confirming');
    } catch {
      // Customer not found — auto-create, enroll, and grant consent
      try {
        if (!merchant) throw new Error('No merchant context');
        const newCustomer = await customerApi.create(normalizedPhone);
        await customerApi.enroll(newCustomer.customerId, merchant.merchantId);
        await customerApi.grantConsent(newCustomer.customerId, merchant.merchantId);
        // Re-fetch to get full data with enrollment
        const updated = await customerApi.getByPhone(normalizedPhone);
        setCustomer(updated);
        setStep('confirming');
      } catch (createErr) {
        setError(createErr instanceof Error ? createErr.message : t('errors.serverError'));
      }
    } finally {
      setIsLookingUp(false);
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
      customerName: customer.name,
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
                    isLookingUp || !phone || !amount || (isMultiLocation && !selectedLocationId)
                  }
                >
                  {isLookingUp ? t('common.loading') : t('common.next')}
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
                    {formatNumber(
                      customer.enrollments?.find(
                        (e: { merchantId: string }) => e.merchantId === merchant?.merchantId,
                      )?.merchantPointsBalance ?? 0,
                    )}
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

            {/* Hidden printable receipt */}
            <div className="hidden print:block">
              <ThermalReceipt
                transactionId={result.transactionId}
                businessName={merchant.businessName}
                customerName={customer.name}
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
