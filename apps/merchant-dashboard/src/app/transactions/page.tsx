'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LocationSelector } from '@/components/analytics';
import { ClientDate } from '@/components/ui/ClientDate';
import { Skeleton } from '@/components/ui/Skeleton';
import { useInfiniteTransactions, useMerchant, useMerchantCustomers } from '@/hooks/api';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone, getStatusBadge, getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { ArrowDownUp, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function TransactionsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton indices
        <Card key={i} className="stagger-item">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
                <div className="flex gap-2 mt-1">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Extract numeric amount — handles both `{amount, currency}` object and plain number */
function getAmount(amount: unknown): number {
  if (typeof amount === 'number') return amount;
  if (amount && typeof amount === 'object' && 'amount' in amount) {
    return (amount as { amount: number }).amount;
  }
  return 0;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: transaction list with filters, sorting, CSV export, and expandable breakdown
export default function TransactionsPage() {
  const { t, formatCurrency, formatNumber, locale } = useTranslation();
  const { textStart, textEnd } = useRTL();
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const { data: merchantData } = useMerchant();
  const {
    data: txPages,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(50, locationId, sortOrder);
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
  const customerPhones: Record<string, string> = {};
  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  for (const c of (customersData?.customers || []) as any[]) {
    if (c.customerId && c.name) customerNames[c.customerId] = c.name;
    if (c.customerId && c.phone) customerPhones[c.customerId] = formatPhone(c.phone);
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
            <option value="all">{t('transaction.allTypes')}</option>
            <option value="EARN">{t('transaction.purchase')}</option>
            <option value="REDEEM">{t('transaction.redemption')}</option>
            <option value="EXPIRATION">{t('transaction.expiration')}</option>
          </select>
          <LocationSelector locations={locations} selected={locationId} onChange={setLocationId} />
          <Button
            variant="outline"
            onClick={() => setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
          >
            <ArrowDownUp className="h-4 w-4 me-2" />
            {sortOrder === 'DESC' ? t('transaction.sortNewest') : t('transaction.sortOldest')}
          </Button>
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
                customerNames[tx.customerId] || customerPhones[tx.customerId] || tx.customerId,
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

      <ErrorBoundary>
        <div className="space-y-3">
          {isLoading && <TransactionsTableSkeleton />}
          {!isLoading && transactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
          )}
          {transactions.map((tx) => {
            const typeBadge = getTypeBadge(tx.type);
            const statusBadge = getStatusBadge(tx.status);
            const isExpanded = expandedTxId === tx.transactionId;
            const breakdown = tx.breakdown;
            return (
              <Card key={tx.transactionId} className="stagger-item">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={textStart}>
                      <p className="font-medium text-sm">
                        {customerNames[tx.customerId] ||
                          customerPhones[tx.customerId] ||
                          tx.customerId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <ClientDate date={tx.createdAt} format="datetime" locale={locale} />
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge.className}`}>
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
                        {tx.campaignName && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {tx.campaignName}{' '}
                            {tx.campaignMultiplier ? `${tx.campaignMultiplier}x` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`${textEnd} flex flex-col items-end gap-1`}>
                      <p className="font-medium">{formatCurrency(getAmount(tx.amount))}</p>
                      <p
                        className={`text-sm ${tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'}`}
                      >
                        {tx.type === 'EARN' ? '+' : '-'}
                        {formatNumber(tx.points)} {t('common.points')}
                      </p>
                      {breakdown && tx.type === 'EARN' && (
                        <button
                          type="button"
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.transactionId)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {t('transaction.breakdown')}
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && breakdown && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                      <p>
                        {breakdown.purchaseAmount} SAR × {breakdown.pointsPerSAR}{' '}
                        {t('transaction.breakdown_rate')} = {breakdown.basePoints}{' '}
                        {t('transaction.breakdown_base')}
                      </p>
                      <p>
                        {t('transaction.breakdown_tier')}: {breakdown.tierName} (
                        {breakdown.tierMultiplier}×)
                      </p>
                      {breakdown.campaignName && (
                        <p>
                          {t('transaction.breakdown_campaign')}: {breakdown.campaignName} (
                          {breakdown.campaignMultiplier}×)
                        </p>
                      )}
                      {breakdown.bonusPointsCap !== undefined &&
                        breakdown.bonusPointsBeforeCap !== undefined && (
                          <p>
                            {t('transaction.breakdown_capped')}: {breakdown.bonusPointsCap}{' '}
                            {t('transaction.breakdown_was')} {breakdown.bonusPointsBeforeCap}
                          </p>
                        )}
                      <p className="font-medium text-foreground">
                        {t('transaction.breakdown_merchant')}: {breakdown.finalMerchantPoints} ·{' '}
                        {t('transaction.breakdown_global')}: {breakdown.finalGlobalPoints}
                      </p>
                    </div>
                  )}
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
            {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
          </Button>
        )}
      </ErrorBoundary>
    </DashboardLayout>
  );
}
