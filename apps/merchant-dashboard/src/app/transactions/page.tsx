'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { LocationSelector } from '@/components/analytics';
import { useInfiniteTransactions, useMerchant, useMerchantCustomers } from '@/hooks/api';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { getStatusBadge, getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/** Extract numeric amount — handles both `{amount, currency}` object and plain number */
function getAmount(amount: unknown): number {
  if (typeof amount === 'number') return amount;
  if (amount && typeof amount === 'object' && 'amount' in amount) {
    return (amount as { amount: number }).amount;
  }
  return 0;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page component with filtering, export, and conditional rendering
export default function TransactionsPage() {
  const { t, formatCurrency, formatNumber, language, locale } = useTranslation();
  const { textStart, textEnd } = useRTL();
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: merchantData } = useMerchant();
  const {
    data: txPages,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(50, locationId);
  const { data: customersData } = useMerchantCustomers({ limit: 100 });

  const allTransactions = (txPages?.pages.flatMap((p) => p.transactions || []) ||
    []) as TransactionResponse[];
  const transactions =
    typeFilter === 'all' ? allTransactions : allTransactions.filter((tx) => tx.type === typeFilter);
  const locations = merchantData?.locations || [];

  // Build lookup maps for display names
  const locationNames: Record<string, string> = {};
  for (const loc of locations) {
    locationNames[loc.locationId] = loc.name;
  }
  const customerNames: Record<string, string> = {};
  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  for (const c of (customersData?.customers || []) as any[]) {
    if (c.customerId && c.name) customerNames[c.customerId] = c.name;
  }

  useEffect(() => {
    if (error) toast.error(error.message || t('errors.serverError'));
  }, [error, t]);

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('transaction.title')}
        </h1>
        <div className="flex gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
            <option value="EARN">{t('transaction.purchase')}</option>
            <option value="REDEEM">{t('transaction.redemption')}</option>
            <option value="EXPIRATION">{language === 'ar' ? 'انتهاء' : 'Expiration'}</option>
          </select>
          <LocationSelector locations={locations} selected={locationId} onChange={setLocationId} />
          <Button
            variant="outline"
            onClick={() => {
              const headers = [
                'Date',
                'ID',
                'Customer',
                'Type',
                'Points',
                'Amount (SAR)',
                'Status',
              ];
              const rows = transactions.map((tx) => [
                new Date(tx.createdAt).toISOString(),
                tx.transactionId,
                customerNames[tx.customerId] || tx.customerId,
                tx.type,
                tx.points,
                getAmount(tx.amount),
                tx.status,
              ]);
              const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={transactions.length === 0}
          >
            <Download className="h-4 w-4 me-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
        )}
        {!isLoading && transactions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
        )}
        {transactions.map((tx) => {
          const typeBadge = getTypeBadge(tx.type);
          const statusBadge = getStatusBadge(tx.status);
          return (
            <Card key={tx.transactionId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={textStart}>
                    <p className="font-medium text-sm">
                      {customerNames[tx.customerId] || tx.customerId}
                    </p>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleString(locale)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge.className}`}>
                        {typeBadge.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
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
              </CardContent>
            </Card>
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
          {isFetchingNextPage
            ? t('common.loading')
            : language === 'ar'
              ? 'تحميل المزيد'
              : 'Load More'}
        </Button>
      )}
    </DashboardLayout>
  );
}
