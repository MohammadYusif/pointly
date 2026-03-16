'use client';

import { useTranslation } from '@pointly/i18n';
import type { TransactionResponse } from '@pointly/shared';
import { getTypeBadge } from '@pointly/shared';
import { useState } from 'react';

interface TransactionItemProps {
  transaction: TransactionResponse;
  merchantName?: string;
}

export function TransactionItem({ transaction, merchantName }: TransactionItemProps) {
  const { formatNumber, formatDate, t } = useTranslation();
  const badge = getTypeBadge(transaction.type);
  const isEarn = transaction.type === 'EARN';
  const [expanded, setExpanded] = useState(false);
  const breakdown = transaction.breakdown;

  return (
    <div className="stagger-item">
      <div className="flex justify-between items-center">
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
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
          {breakdown && isEarn && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-blue-600 mt-1 block"
            >
              {expanded ? '▲' : '▼'} {t('transaction.breakdown')}
            </button>
          )}
        </div>
      </div>
      {expanded && breakdown && (
        <div className="mt-2 text-xs text-muted-foreground space-y-1 ps-2 border-s-2 border-muted">
          <p>
            {breakdown.purchaseAmount} SAR × {breakdown.pointsPerSAR}{' '}
            {t('transaction.breakdown_rate')} = {breakdown.basePoints}{' '}
            {t('transaction.breakdown_base')}
          </p>
          <p>
            {t('transaction.breakdown_tier')}: {breakdown.tierName} ({breakdown.tierMultiplier}×)
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
    </div>
  );
}
