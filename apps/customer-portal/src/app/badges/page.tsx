'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { MilestoneBadge } from '@/components/MilestoneBadge';
import { TierBadge } from '@/components/TierBadge';
import { useCustomer } from '@/hooks/api';
import { useBadges } from '@/hooks/use-badges';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';

function BadgesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 skeleton rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  const { data: customer, isLoading } = useCustomer();
  const badges = useBadges(customer);

  const earnedBadges = badges.filter((b) => b.isEarned);
  const lockedBadges = badges.filter((b) => !b.isEarned);

  if (isLoading) {
    return (
      <CustomerLayout>
        <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('badges.title')}</h1>
        <BadgesSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <h1 className={`text-xl font-bold mb-4 ${textStart}`}>{t('badges.title')}</h1>

      <div className="space-y-4">
        {/* Current Tier */}
        {customer && (
          <Card className="stagger-item">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('customer.tier')}</p>
              <TierBadge tier={customer.currentTier} label={customer.tierDisplayName} />
            </CardContent>
          </Card>
        )}

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">
                {t('badges.earned')} ({earnedBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {earnedBadges.map((badge) => (
                  <MilestoneBadge key={badge.id} badge={badge} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">
                {t('badges.locked')} ({lockedBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {lockedBadges.map((badge) => (
                  <MilestoneBadge key={badge.id} badge={badge} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}
