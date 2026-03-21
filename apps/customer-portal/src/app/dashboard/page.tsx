'use client';

import { ChallengeCard } from '@/components/ChallengeCard';
import { CustomerLayout } from '@/components/CustomerLayout';
import { DecayWarning } from '@/components/DecayWarning';
import { MilestoneBadge } from '@/components/MilestoneBadge';
import { PerksSection } from '@/components/PerksSection';
import { PointsCard } from '@/components/PointsCard';
import { ProgressRing } from '@/components/ProgressRing';
import { TierBadge } from '@/components/TierBadge';
import { TransactionItem } from '@/components/TransactionItem';
import {
  useChallengeCheckIn,
  useCustomer,
  useMyChallenges,
  useMyMerchants,
  useRecentTransactions,
  useTierBenefits,
} from '@/hooks/api';
import { useBadges } from '@/hooks/use-badges';
import { useTranslation } from '@pointly/i18n';
import { getTierColor, getTierTarget } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { Gem, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

const STREAK_BONUS_BY_TIER: Record<string, number> = {
  BRONZE: 500,
  GOLD: 550,
  PLATINUM: 625,
  DIAMOND: 750,
};

function getStreakBonusForTier(tier: string): number {
  return STREAK_BONUS_BY_TIER[tier] ?? 500;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="h-6 w-40 skeleton" />
        <div className="h-4 w-20 skeleton" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {['g', 'm'].map((k) => (
          <div key={k} className="h-24 skeleton rounded-xl" />
        ))}
      </div>
      <div className="flex justify-center py-4">
        <div className="h-28 w-28 rounded-full skeleton" />
      </div>
      <div className="h-20 skeleton rounded-xl" />
      <div className="h-48 skeleton rounded-xl" />
    </div>
  );
}

export default function CustomerDashboard() {
  const { t, formatNumber } = useTranslation();
  const { textStart } = useRTL();

  const { data: customer, isLoading: customerLoading, refetch } = useCustomer();
  const { data: txData, isLoading: txLoading } = useRecentTransactions(5);
  const { data: merchants } = useMyMerchants();
  const { data: challengeData } = useMyChallenges();
  const { data: tierBenefits } = useTierBenefits();
  const checkIn = useChallengeCheckIn();

  // Fire-and-forget check-in on dashboard mount — counts as an app visit for streak.
  // Activates customers who open the app but don't make purchases.
  // mutate is stable across renders (TanStack Query guarantees this).
  useEffect(() => {
    checkIn.mutate();
  }, [checkIn.mutate]);
  const badges = useBadges(customer);
  const earnedBadges = badges.filter((b) => b.isEarned).slice(0, 3);

  const merchantNameMap = useMemo(() => {
    const names: Record<string, string> = {};
    if (merchants) {
      for (const m of merchants) {
        names[m.merchantId] = m.businessName;
      }
    }
    return names;
  }, [merchants]);

  const transactions = txData?.transactions ?? [];

  if (customerLoading) {
    return (
      <CustomerLayout>
        <DashboardSkeleton />
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

  const tierTarget = getTierTarget(customer.currentTier);
  const progress = customer.monthlyProgress || 0;
  const progressPercent = tierTarget > 0 ? Math.min(100, (progress / tierTarget) * 100) : 100;

  const enrolledCount = (customer.enrollments || []).length;

  const getDaysRemainingInWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  };

  return (
    <CustomerLayout>
      <div className="space-y-4">
        {/* Welcome */}
        <div className={`stagger-item ${textStart}`}>
          <h1 className="text-xl font-bold">
            {t('dashboard.welcome')} {customer.name || ''}
          </h1>
          <TierBadge tier={customer.currentTier} label={customer.tierDisplayName} size="sm" />
        </div>

        {/* Point Balance + Merchants Enrolled */}
        <div className="grid grid-cols-2 gap-3">
          <PointsCard
            value={customer.globalPointsBalance}
            label={t('dashboard.pointlyPoints')}
            variant="primary"
            icon={<Gem className="h-5 w-5" />}
          />
          <PointsCard
            value={enrolledCount}
            label={t('dashboard.merchantsEnrolled')}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
        </div>

        {/* Tier Progress Ring */}
        {tierTarget > 0 && (
          <Card className="stagger-item">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <ProgressRing progress={progressPercent} tier={customer.currentTier}>
                <div className="text-center">
                  <p className={`text-sm font-bold ${getTierColor(customer.currentTier)}`}>
                    {customer.tierDisplayName}
                  </p>
                </div>
              </ProgressRing>
              <p className="text-sm text-muted-foreground">
                {formatNumber(progress)} / {formatNumber(tierTarget)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(customer.pointsToNextTier || 0)} {t('dashboard.pointsToNextTier')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Decay Warning */}
        {customer.nextDecayDate && (
          <DecayWarning
            nextDecayDate={customer.nextDecayDate}
            globalPointsBalance={customer.globalPointsBalance}
            isDecayImmune={customer.isDecayImmune}
            decayPhase={customer.globalPointsDecayPhase}
          />
        )}

        {/* Active Challenges */}
        {challengeData && (
          <Card className="stagger-item">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('challenges.activeChallenges')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChallengeCard
                title={t('challenges.weeklyStreak')}
                description={t('challenges.weeklyStreakDesc', { count: 3 })}
                current={challengeData.weeklyVisitCount}
                target={3}
                bonusPoints={tierBenefits ? getStreakBonusForTier(tierBenefits.tier) : 500}
                daysRemaining={getDaysRemainingInWeek()}
              />
            </CardContent>
          </Card>
        )}

        {/* Tier Benefits */}
        {tierBenefits && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">{t('tier.benefits')}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('tier.benefitsSubtitle', { tier: tierBenefits.displayName })}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tierBenefits.benefits.map((b) => (
                  <li key={b.key} className="flex items-center gap-2 text-sm">
                    <span>{b.icon}</span>
                    <span>{t(`tier.${b.key}`)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Badges Summary */}
        {earnedBadges.length > 0 && (
          <Card className="stagger-item">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('badges.title')}</CardTitle>
              <Link href="/badges" className="text-xs text-primary hover:underline">
                {t('common.viewAll')}
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {earnedBadges.map((badge) => (
                  <MilestoneBadge key={badge.id} badge={badge} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card className="stagger-item">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.recentTransactions')}</CardTitle>
            <Link href="/history" className="text-xs text-primary hover:underline">
              {t('common.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {txLoading ? (
              <div className="space-y-3">
                {['ta', 'tb', 'tc'].map((k) => (
                  <div key={k} className="h-12 skeleton rounded-md" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              transactions.map((tx) => (
                <TransactionItem
                  key={tx.transactionId}
                  transaction={tx}
                  merchantName={merchantNameMap[tx.merchantId]}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* VIP Perks */}
        <PerksSection />
      </div>
    </CustomerLayout>
  );
}
