'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { TransactionItem } from '@/components/TransactionItem';
import { useInfiniteTransactions, useMyMerchants } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { Button, useRTL } from '@pointly/ui';
import { useMemo } from 'react';

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

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteTransactions(20);

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
      <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('customer.transactionHistory')}</h1>

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
