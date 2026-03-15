'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { DecayWarning } from '@/components/DecayWarning';
import { PointsCard } from '@/components/PointsCard';
import { ProgressRing } from '@/components/ProgressRing';
import { useCustomer, useGiftPoints, useMyMerchants } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerEnrollment } from '@pointly/shared';
import {
  DEFAULT_REDEMPTION_RATE,
  getTierColor,
  getTierTarget,
  isValidSaudiPhone,
  normalizePhone,
} from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function WalletSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 skeleton" />
      <div className="grid grid-cols-2 gap-3">
        {['a', 'b'].map((k) => (
          <div key={k} className="h-24 skeleton rounded-xl" />
        ))}
      </div>
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-40 skeleton rounded-xl" />
      <div className="h-32 skeleton rounded-xl" />
    </div>
  );
}

interface GiftCardProps {
  maxPoints: number;
}

function GiftCard({ maxPoints }: GiftCardProps) {
  const { t } = useTranslation();
  const giftMutation = useGiftPoints();
  const [showGift, setShowGift] = useState(false);
  const [giftPhone, setGiftPhone] = useState('');
  const [giftPoints, setGiftPoints] = useState('');

  const handleGiftPoints = async () => {
    const points = Number.parseInt(giftPoints, 10);
    if (!points || points < 1) {
      toast.error(t('gift.minPoints'));
      return;
    }
    if (points > maxPoints) {
      toast.error(t('gift.insufficientPoints'));
      return;
    }
    if (!isValidSaudiPhone(giftPhone)) {
      toast.error(t('gift.invalidPhone'));
      return;
    }
    try {
      await giftMutation.mutateAsync({
        recipientPhone: normalizePhone(giftPhone),
        points,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(t('gift.success'));
      setGiftPhone('');
      setGiftPoints('');
      setShowGift(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <Card className="stagger-item">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('gift.title')}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowGift(!showGift)}>
          {t('gift.send')}
        </Button>
      </CardHeader>
      {showGift && (
        <CardContent className="space-y-3">
          <div>
            <label htmlFor="gift-phone" className="text-sm text-muted-foreground block mb-1">
              {t('gift.recipientPhone')}
            </label>
            <Input
              id="gift-phone"
              placeholder={t('gift.recipientPhonePlaceholder')}
              value={giftPhone}
              onChange={(e) => setGiftPhone(e.target.value)}
              dir="ltr"
            />
          </div>
          <div>
            <label htmlFor="gift-points" className="text-sm text-muted-foreground block mb-1">
              {t('gift.pointsToGift')}
            </label>
            <Input
              id="gift-points"
              type="number"
              min="1"
              max={maxPoints}
              value={giftPoints}
              onChange={(e) => setGiftPoints(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowGift(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleGiftPoints}
              disabled={giftMutation.isPending || !giftPhone || !giftPoints}
            >
              {giftMutation.isPending ? t('common.loading') : t('gift.send')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function WalletPage() {
  const { t, formatNumber, formatCurrency, formatDate } = useTranslation();
  const { textStart } = useRTL();

  const { data: customer, isLoading: customerLoading, refetch } = useCustomer();
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

  if (customerLoading) {
    return (
      <CustomerLayout>
        <WalletSkeleton />
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <Button variant="outline" onClick={() => refetch()} size="sm">
            {t('auth.statsRetry')}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const sarValue = customer.globalPointsBalance * DEFAULT_REDEMPTION_RATE;
  const tierTarget = getTierTarget(customer.currentTier);
  const progress = customer.monthlyProgress || 0;
  const progressPercent = tierTarget > 0 ? Math.min(100, (progress / tierTarget) * 100) : 100;

  const totalMerchantPoints = (customer.enrollments || []).reduce(
    (sum: number, e: CustomerEnrollment) => sum + (e.merchantPointsBalance || 0),
    0,
  );

  const decayPhaseLabel =
    customer.globalPointsDecayPhase === 0
      ? t('wallet.phase0')
      : customer.globalPointsDecayPhase === 1
        ? t('wallet.phase1')
        : t('wallet.phase2');

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className={`text-xl font-bold stagger-item ${textStart}`}>{t('wallet.title')}</h1>

        {/* Global Points + SAR Value */}
        <div className="grid grid-cols-2 gap-3">
          <PointsCard
            value={customer.globalPointsBalance}
            label={t('wallet.globalPoints')}
            sublabel={`${formatCurrency(sarValue)} ${t('wallet.sarValue')}`}
            variant="primary"
          />
          <PointsCard value={customer.globalLifetimePoints} label={t('wallet.lifetimeEarned')} />
        </div>

        {/* Total Merchant Points */}
        <PointsCard value={totalMerchantPoints} label={t('wallet.totalMerchantPoints')} />

        {/* Per-Merchant Breakdown */}
        {customer.enrollments && customer.enrollments.length > 0 && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">{t('wallet.perMerchant')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.enrollments.map((e: CustomerEnrollment) => (
                <div key={e.merchantId} className="flex justify-between items-center">
                  <span className="text-sm">{merchantNameMap[e.merchantId] || e.merchantId}</span>
                  <span className="font-medium">
                    {formatNumber(e.merchantPointsBalance)} {t('common.points')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tier Card */}
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="text-base">{t('wallet.tierCard')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-6">
            <ProgressRing progress={progressPercent} tier={customer.currentTier}>
              <div className="text-center">
                <p className={`text-sm font-bold ${getTierColor(customer.currentTier)}`}>
                  {customer.tierDisplayName}
                </p>
              </div>
            </ProgressRing>

            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wallet.earningMultiplier')}</span>
                <span className="font-medium">{customer.earningMultiplier}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wallet.decayImmune')}</span>
                <span
                  className={`font-medium ${customer.isDecayImmune ? 'text-green-600' : 'text-amber-600'}`}
                >
                  {customer.isDecayImmune ? '✓' : '✗'}
                </span>
              </div>
              {tierTarget > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('wallet.monthlyProgress')}</span>
                  <span className="font-medium">
                    {formatNumber(progress)} / {formatNumber(tierTarget)}
                  </span>
                </div>
              )}
              {customer.monthlyProgressResetAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('wallet.progressReset')}</span>
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {formatDate(customer.monthlyProgressResetAt)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Decay Status */}
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="text-base">{t('wallet.decayStatus')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('wallet.decayPhase')}</span>
              <span className="font-medium">{decayPhaseLabel}</span>
            </div>
          </CardContent>
        </Card>

        {/* Decay Warning */}
        {customer.nextDecayDate && (
          <DecayWarning
            nextDecayDate={customer.nextDecayDate}
            globalPointsBalance={customer.globalPointsBalance}
            isDecayImmune={customer.isDecayImmune}
            decayPhase={customer.globalPointsDecayPhase}
          />
        )}

        {/* Gift Points */}
        <GiftCard maxPoints={customer.globalPointsBalance} />
      </div>
    </CustomerLayout>
  );
}
