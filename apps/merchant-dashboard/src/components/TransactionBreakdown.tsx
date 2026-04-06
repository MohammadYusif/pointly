'use client';

import type { TransactionBreakdown as Breakdown } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatNumber } from '@pointly/shared';
import { Card, CardContent } from '@pointly/ui';

interface TransactionBreakdownProps {
  breakdown: Breakdown;
}

export function TransactionBreakdown({ breakdown }: TransactionBreakdownProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <p className="text-sm font-medium">{t('transaction.breakdown')}</p>
        <div className="text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-muted-foreground">
              {t('transaction.breakdown_purchase')}
            </span>
            <span className="text-end font-medium">
              {formatNumber(breakdown.purchaseAmount)} SAR
            </span>

            <span className="text-muted-foreground">
              {t('transaction.breakdown_rate')}
            </span>
            <span className="text-end font-medium">
              {breakdown.pointsPerSAR} {t('transaction.breakdown_ptPerSar')}
            </span>

            <span className="text-muted-foreground">
              {t('transaction.breakdown_basePoints')}
            </span>
            <span className="text-end font-medium">
              {formatNumber(breakdown.basePoints)}
            </span>
          </div>

          <div className="border-t border-border/50" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-muted-foreground">
              {t('transaction.breakdown_tier')}
            </span>
            <span className="text-end">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                {breakdown.tierName} {breakdown.tierMultiplier}×
              </span>
            </span>
            {breakdown.campaignName && (
              <>
                <span className="text-muted-foreground">
                  {t('transaction.breakdown_campaign')}
                </span>
                <span className="text-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-medium">
                    {breakdown.campaignName} {breakdown.campaignMultiplier}×
                  </span>
                </span>
              </>
            )}
          </div>

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

          <div className="border-t border-border/50" />

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
      </CardContent>
    </Card>
  );
}
