'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { TransactionItem } from '@/components/TransactionItem';
import { useInfiniteTransactions, useMyMerchants } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { Button, useRTL } from '@pointly/ui';
import { ArrowDownUp } from 'lucide-react';
import { useMemo, useState } from 'react';

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {['a', 'b', 'c', 'd', 'e'].map((k) => (
        <div key={k} className="h-16 skeleton rounded-xl" />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteTransactions(20, sortOrder, typeFilter);

  const { data: merchants } = useMyMerchants();

  const merchantNameMap = useMemo(() => {
    const names: Record<string, string> = {};
    if (merchants) {
      for (const m of merchants) {
        names[m.merchantId] = m.businessName;
      }
    }
    return names;
  }, [merchants]);

  const transactions = useMemo(
    () => data?.pages.flatMap((page) => page.transactions ?? []) ?? [],
    [data],
  );

  return (
    <CustomerLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className={`text-xl font-bold ${textStart}`}>{t('customer.transactionHistory')}</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter ?? 'all'}
            onChange={(e) => setTypeFilter(e.target.value === 'all' ? undefined : e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">{t('transaction.allTypes')}</option>
            <option value="EARN">{t('transaction.purchase')}</option>
            <option value="REDEEM">{t('transaction.redemption')}</option>
            <option value="EXPIRATION">{t('transaction.expiration')}</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
          >
            <ArrowDownUp className="h-4 w-4 me-1" />
            {sortOrder === 'DESC' ? t('transaction.sortNewest') : t('transaction.sortOldest')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <HistorySkeleton />
      ) : transactions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionItem
              key={tx.transactionId}
              transaction={tx}
              merchantName={merchantNameMap[tx.merchantId]}
            />
          ))}
        </div>
      )}

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
    </CustomerLayout>
  );
}
