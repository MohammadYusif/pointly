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
  const isCredit = transaction.balanceAfter >= transaction.balanceBefore;
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
          <span className={`font-medium ${isCredit ? 'text-green-600' : 'text-amber-600'}`}>
            {isCredit ? '+' : '-'}
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
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs space-y-2">
          {/* Calculation rows */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-muted-foreground">{t('transaction.breakdown_purchase')}</span>
            <span className="text-end font-medium">
              {formatNumber(breakdown.purchaseAmount)} SAR
            </span>

            <span className="text-muted-foreground">{t('transaction.breakdown_rate')}</span>
            <span className="text-end font-medium">
              {breakdown.pointsPerSAR} {t('transaction.breakdown_ptPerSar')}
            </span>

            <span className="text-muted-foreground">{t('transaction.breakdown_basePoints')}</span>
            <span className="text-end font-medium">{formatNumber(breakdown.basePoints)}</span>
          </div>

          <div className="border-t border-border/50 my-1" />

          {/* Multipliers */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-muted-foreground">{t('transaction.breakdown_tier')}</span>
            <span className="text-end">
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 font-medium">
                {breakdown.tierName} {breakdown.tierMultiplier}×
              </span>
            </span>
            {breakdown.campaignName && (
              <>
                <span className="text-muted-foreground">{t('transaction.breakdown_campaign')}</span>
                <span className="text-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-medium">
                    {breakdown.campaignName} {breakdown.campaignMultiplier}×
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Bonus cap warning */}
          {breakdown.bonusPointsCap !== undefined &&
            breakdown.bonusPointsBeforeCap !== undefined && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-800 flex items-center justify-between">
                <span>{t('transaction.breakdown_bonusCapped')}</span>
                <span className="font-medium">
                  +{formatNumber(breakdown.bonusPointsCap)}
                  <span className="text-amber-600 ms-1">
                    ({t('transaction.breakdown_beforeCap')}: +
                    {formatNumber(breakdown.bonusPointsBeforeCap)})
                  </span>
                </span>
              </div>
            )}

          <div className="border-t border-border/50 my-1" />

          {/* Final totals */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-medium text-foreground">
            <span>{t('transaction.breakdown_merchant')}</span>
            <span className="text-end text-green-600">
              +{formatNumber(breakdown.finalMerchantPoints)}
            </span>
            <span>{t('transaction.breakdown_global')}</span>
            <span className="text-end text-blue-600">
              +{formatNumber(breakdown.finalGlobalPoints)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
