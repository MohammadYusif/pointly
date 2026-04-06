'use client';

import { ClientDate } from '@/components/ui/ClientDate';
import { getAmount } from '@/lib/utils';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { getStatusBadge, getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { ArrowDownUp } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { CustomerTransactionExport } from './CustomerTransactionExport';

interface CustomerTransactionTableProps {
  transactions: TransactionResponse[];
  allTransactions: TransactionResponse[];
  locationNames: Record<string, string>;
  typeFilter: string;
  setTypeFilter: Dispatch<SetStateAction<string>>;
  sortOrder: 'ASC' | 'DESC';
  setSortOrder: Dispatch<SetStateAction<'ASC' | 'DESC'>>;
  txLoading: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  customerId: string;
}

export function CustomerTransactionTable({
  transactions,
  allTransactions,
  locationNames,
  typeFilter,
  setTypeFilter,
  sortOrder,
  setSortOrder,
  txLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  customerId,
}: CustomerTransactionTableProps) {
  const { t, formatCurrency, formatNumber, locale } = useTranslation();
  const { textStart, textEnd } = useRTL();

  return (
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
              {sortOrder === 'DESC' ? t('transaction.sortNewest') : t('transaction.sortOldest')}
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
            <CustomerTransactionExport
              allTransactions={allTransactions}
              customerId={customerId}
              locationNames={locationNames}
            />
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
                  <p className="text-xs text-muted-foreground">
                    <ClientDate date={tx.createdAt} format="datetime" locale={locale} />
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
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
  );
}
