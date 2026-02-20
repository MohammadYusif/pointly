'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { getCustomerTransactions } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { TransactionResponse } from '@pointly/shared';
import { getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { useCallback, useEffect, useState } from 'react';

export default function HistoryPage() {
  const { t, formatNumber, locale } = useTranslation();
  const { textStart } = useRTL();

  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadTransactions = useCallback(async (token?: string) => {
    try {
      const result = await getCustomerTransactions({ limit: 20, nextToken: token });
      if (token) {
        setTransactions((prev) => [...prev, ...(result.transactions || [])]);
      } else {
        setTransactions(result.transactions || []);
      }
      setNextToken(result.nextToken);
    } catch {
      // handle error
    }
  }, []);

  useEffect(() => {
    loadTransactions().finally(() => setLoading(false));
  }, [loadTransactions]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTransactions(nextToken);
    setLoadingMore(false);
  };

  return (
    <CustomerLayout>
      <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('customer.transactionHistory')}</h1>

      {loading && <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>}

      <div className="space-y-3">
        {transactions.map((tx) => {
          const badge = getTypeBadge(tx.type);
          return (
            <Card key={tx.transactionId}>
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${tx.type === 'EARN' ? 'text-green-600' : 'text-amber-600'}`}
                  >
                    {tx.type === 'EARN' ? '+' : '-'}
                    {formatNumber(tx.points)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && transactions.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
      )}

      {nextToken && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? t('common.loading') : t('common.loadMore')}
        </Button>
      )}
    </CustomerLayout>
  );
}
