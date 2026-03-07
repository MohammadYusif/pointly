'use client';

import { useTranslation } from '@pointly/i18n';
import type { TransactionResponse } from '@pointly/shared';
import { getTypeBadge } from '@pointly/shared';

interface TransactionItemProps {
  transaction: TransactionResponse;
  merchantName?: string;
}

export function TransactionItem({ transaction, merchantName }: TransactionItemProps) {
  const { formatNumber, formatDate } = useTranslation();
  const badge = getTypeBadge(transaction.type);
  const isEarn = transaction.type === 'EARN';

  return (
    <div className="stagger-item flex justify-between items-center">
      <div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
        <p className="text-sm text-muted-foreground mt-1">
          {merchantName || transaction.merchantId}
        </p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {formatDate(transaction.createdAt)}
        </p>
      </div>
      <div className="text-end">
        <span className={`font-medium ${isEarn ? 'text-green-600' : 'text-amber-600'}`}>
          {isEarn ? '+' : '-'}
          {formatNumber(transaction.points)}
        </span>
        {transaction.amount > 0 && (
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {formatNumber(transaction.amount)} SAR
          </p>
        )}
      </div>
    </div>
  );
}
