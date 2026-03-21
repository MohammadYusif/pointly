'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  useCustomerById,
  useInfiniteCustomerTransactions,
  useMerchant,
  useMerchantGiftPoints,
} from '@/hooks/api';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useRTL,
} from '@pointly/ui';
import { ArrowLeft, ArrowRight, Gift, Receipt, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CustomerSummaryCard } from './CustomerSummaryCard';
import { CustomerTransactionTable } from './CustomerTransactionTable';

export default function CustomerDetailPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id') || '';

  const { t, language } = useTranslation();
  const { textStart } = useRTL();

  const {
    data: customer,
    isLoading: customerLoading,
    error: customerError,
  } = useCustomerById(customerId);
  const { data: merchantData } = useMerchant();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const {
    data: txPages,
    isLoading: txLoading,
    error: txError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteCustomerTransactions(customerId, 20, sortOrder);

  const allTransactions = (txPages?.pages.flatMap((p) => p.transactions || []) ||
    []) as TransactionResponse[];
  const transactions =
    typeFilter === 'all' ? allTransactions : allTransactions.filter((tx) => tx.type === typeFilter);

  const locations = merchantData?.locations || [];
  const locationNames: Record<string, string> = {};
  for (const loc of locations) {
    locationNames[loc.locationId] = loc.name;
  }

  const enrollment = customer?.enrollment;

  useEffect(() => {
    if (customerError) toast.error(customerError.message || t('errors.serverError'));
    if (txError) toast.error(txError.message || t('errors.serverError'));
  }, [customerError, txError, t]);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const giftMutation = useMerchantGiftPoints();
  const [giftPoints, setGiftPoints] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);

  const handleGiftSubmit = async () => {
    const points = Number.parseInt(giftPoints, 10);
    if (!merchantData?.merchantId || !customerId || Number.isNaN(points) || points <= 0) {
      toast.error(t('errors.required'));
      return;
    }
    try {
      await giftMutation.mutateAsync({
        merchantId: merchantData.merchantId,
        data: {
          customerId,
          points,
          idempotencyKey: crypto.randomUUID(),
          ...(giftNote.trim() ? { note: giftNote.trim() } : {}),
        },
      });
      toast.success(t('customer.giftSuccess', { points }));
      setGiftPoints('');
      setGiftNote('');
      setGiftSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.serverError'));
    }
  };

  if (!customerId) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-8">{t('errors.notFound')}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Back button + title */}
      <div className="mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <BackIcon className="h-4 w-4" />
          {t('navigation.customers')}
        </Link>
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('customer.customerDetails')}
        </h1>
      </div>

      {customerLoading && (
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      )}

      {customer && (
        <ErrorBoundary>
          <CustomerSummaryCard customer={customer} enrollment={enrollment} />

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href={`/manual-entry?phone=${customer.phone}`}>
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 me-2" />
                {t('customer.recordPurchase')}
              </Button>
            </Link>
            <Link href={`/redeem?phone=${customer.phone}`}>
              <Button variant="outline">
                <Receipt className="h-4 w-4 me-2" />
                {t('customer.redeemPoints')}
              </Button>
            </Link>
            <Sheet open={giftSheetOpen} onOpenChange={setGiftSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Gift className="h-4 w-4 me-2" />
                  {t('customer.giftPoints')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>{t('customer.giftPoints')}</SheetTitle>
                  <SheetDescription>{t('customer.giftPointsDescription')}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="gift-points" className="text-sm font-medium">
                      {t('customer.pointsToGift')}
                    </label>
                    <Input
                      id="gift-points"
                      type="number"
                      min="1"
                      value={giftPoints}
                      onChange={(e) => setGiftPoints(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="gift-note" className="text-sm font-medium">
                      {t('customer.giftNote')}{' '}
                      <span className="text-muted-foreground">({t('common.optional')})</span>
                    </label>
                    <Input
                      id="gift-note"
                      type="text"
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder={t('customer.giftNotePlaceholder')}
                      maxLength={200}
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button
                    onClick={handleGiftSubmit}
                    disabled={giftMutation.isPending || !giftPoints}
                  >
                    {giftMutation.isPending ? t('common.loading') : t('customer.confirmGift')}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          <ErrorBoundary>
            <CustomerTransactionTable
              transactions={transactions}
              allTransactions={allTransactions}
              locationNames={locationNames}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              txLoading={txLoading}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              customerId={customerId}
            />
          </ErrorBoundary>
        </ErrorBoundary>
      )}
    </DashboardLayout>
  );
}
