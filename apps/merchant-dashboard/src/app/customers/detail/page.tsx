'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useCustomerById, useInfiniteCustomerTransactions, useMerchant } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone, getStatusBadge, getTierColor, getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Download,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function getAmount(amount: unknown): number {
  if (typeof amount === 'number') return amount;
  if (amount && typeof amount === 'object' && 'amount' in amount) {
    return (amount as { amount: number }).amount;
  }
  return 0;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page with summary, transactions, filters, and CSV export
export default function CustomerDetailPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id') || '';

  const { t, formatCurrency, formatNumber, language, locale } = useTranslation();
  const { textStart, textEnd } = useRTL();
  const { merchant } = useAuth();
  const merchantId = merchant?.merchantId || '';

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

  // Find this merchant's enrollment for the customer
  const enrollment = customer?.enrollments?.find((e) => e.merchantId === merchantId);

  useEffect(() => {
    if (customerError) toast.error(customerError.message || t('errors.serverError'));
    if (txError) toast.error(txError.message || t('errors.serverError'));
  }, [customerError, txError, t]);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

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
        <>
          {/* Summary Card */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className={textStart}>
                  <p className="text-lg font-semibold">{customer.name || customer.customerId}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {formatPhone(customer.phone)}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${getTierColor(customer.currentTier)}`}
                    style={{
                      backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)',
                    }}
                  >
                    {customer.currentTier}
                  </span>
                </div>
                <div className={`grid grid-cols-2 gap-x-6 gap-y-2 text-sm ${textEnd}`}>
                  <div>
                    <p className="text-muted-foreground">{t('common.points')}</p>
                    <p className="font-semibold text-lg">
                      {formatNumber(enrollment?.merchantPointsBalance ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('customer.lifetimePoints')}</p>
                    <p className="font-semibold text-lg">
                      {formatNumber(enrollment?.merchantLifetimePoints ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('customer.enrolled')}</p>
                    <p className="font-medium" suppressHydrationWarning>
                      {enrollment?.enrolledAt
                        ? new Date(enrollment.enrolledAt).toLocaleDateString(locale)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('customer.lastVisit')}</p>
                    <p className="font-medium" suppressHydrationWarning>
                      {enrollment?.lastTransactionAt
                        ? new Date(enrollment.lastTransactionAt).toLocaleDateString(locale)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg">{t('customer.transactionHistory')}</CardTitle>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
                  >
                    <ArrowDownUp className="h-4 w-4 me-1" />
                    {sortOrder === 'DESC'
                      ? t('transaction.sortNewest')
                      : t('transaction.sortOldest')}
                  </Button>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">{t('transaction.allTypes')}</option>
                    <option value="EARN">{t('transaction.purchase')}</option>
                    <option value="REDEEM">{t('transaction.redemption')}</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const headers = [
                        'Date',
                        'ID',
                        'Type',
                        'Points',
                        'Amount (SAR)',
                        'Status',
                        'Location',
                      ];
                      const rows = transactions.map((tx) => [
                        new Date(tx.createdAt).toISOString(),
                        tx.transactionId,
                        tx.type,
                        tx.points,
                        getAmount(tx.amount),
                        tx.status,
                        tx.locationId ? locationNames[tx.locationId] || tx.locationId : '',
                      ]);
                      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `customer_${customerId}_transactions.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={transactions.length === 0}
                  >
                    <Download className="h-4 w-4 me-1" />
                    {t('customer.exportCSV')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {txLoading && (
                  <p className="text-center text-muted-foreground py-6">{t('common.loading')}</p>
                )}
                {!txLoading && transactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">{t('common.noData')}</p>
                )}
                {transactions.map((tx) => {
                  const typeBadge = getTypeBadge(tx.type);
                  const statusBadge = getStatusBadge(tx.status);
                  return (
                    <div
                      key={tx.transactionId}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                    >
                      <div className={textStart}>
                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                          {new Date(tx.createdAt).toLocaleString(locale)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${typeBadge.className}`}
                          >
                            {typeBadge.label}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                          {tx.locationId && locationNames[tx.locationId] && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              {locationNames[tx.locationId]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={textEnd}>
                        <p className="font-medium">{formatCurrency(getAmount(tx.amount))}</p>
                        <p
                          className={`text-sm ${tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'}`}
                        >
                          {tx.type === 'EARN' ? '+' : '-'}
                          {formatNumber(tx.points)} {t('common.points')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasNextPage && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
