'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ThermalReceipt } from '@/components/receipt/ThermalReceipt';
import { useRecordPurchase } from '@/hooks/api';
import { customerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { generateReceiptPDF } from '@/lib/receipt-pdf';
import type { CustomerResponse, RecordPurchaseResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { CheckCircle, Download, Printer, RotateCcw } from 'lucide-react';
import { useState } from 'react';

type Step = 'input' | 'confirming' | 'submitting' | 'receipt';

export default function ManualEntryPage() {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const { textStart } = useRTL();
  const { merchant } = useAuth();

  const [step, setStep] = useState<Step>('input');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [result, setResult] = useState<RecordPurchaseResponse | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const purchaseMutation = useRecordPurchase();

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
    setCustomer(null);
    setResult(null);
    setError('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!result || !customer || !merchant) return;
    generateReceiptPDF({
      transactionId: result.transactionId,
      businessName: merchant.businessName,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: Number(amount),
      merchantPoints: result.merchantPoints,
      globalPoints: result.globalPoints,
      newMerchantBalance: result.newMerchantBalance,
      newGlobalBalance: result.newGlobalBalance,
      currentTier: result.currentTier,
      date: new Date(),
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond':
        return 'text-purple-600';
      case 'Platinum':
        return 'text-blue-600';
      default:
        return 'text-amber-600';
    }
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
                <div>
                  <label htmlFor="cashier-input" className="text-sm font-medium mb-1 block">
                    {t('common.actions')} ({language === 'ar' ? 'اختياري' : 'optional'})
                  </label>
                  <Input
                    id="cashier-input"
                    placeholder={language === 'ar' ? 'اسم الكاشير' : 'Cashier name'}
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLookingUp || !phone || !amount}
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
                  <span className="font-medium">{formatNumber(customer.globalPointsBalance)}</span>
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
                    +{formatNumber(result.merchantPoints + result.globalPoints)}{' '}
                    {t('common.points')}
                  </p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.tierUpgrade && (
                    <p className={`text-sm font-medium mt-1 ${getTierColor(result.currentTier)}`}>
                      Tier: {result.currentTier}
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
                globalPoints={result.globalPoints}
                newMerchantBalance={result.newMerchantBalance}
                newGlobalBalance={result.newGlobalBalance}
                currentTier={result.currentTier}
                date={new Date()}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="h-4 w-4 me-2" />
                {t('common.actions')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 me-2" />
                PDF
              </Button>
            </div>

            <Button className="w-full" onClick={handleNewTransaction}>
              <RotateCcw className="h-4 w-4 me-2" />
              {t('common.add')} {t('transaction.purchase')}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
