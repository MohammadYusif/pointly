'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { useEnrollMerchant, useMerchantDetail, useMyMerchants } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { ArrowLeft, Gift, MapPin, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-5 w-24 skeleton" />
      <div className="h-8 w-48 skeleton" />
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-24 skeleton rounded-xl" />
    </div>
  );
}

export function MerchantDetailClient() {
  const { t, formatNumber } = useTranslation();
  const { textStart } = useRTL();
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('id') ?? '';

  const { data: merchant, isLoading, error } = useMerchantDetail(merchantId);
  const { data: myMerchants } = useMyMerchants();
  const enrollMutation = useEnrollMerchant();

  const isEnrolled = useMemo(() => {
    if (!myMerchants) return false;
    return myMerchants.some((m) => m.merchantId === merchantId);
  }, [myMerchants, merchantId]);

  const handleEnroll = () => {
    enrollMutation.mutate(merchantId, {
      onSuccess: () => toast.success(t('merchants.joinSuccess')),
    });
  };

  if (merchantId && isLoading) {
    return (
      <CustomerLayout>
        <DetailSkeleton />
      </CustomerLayout>
    );
  }

  if (!merchantId || error || !merchant) {
    return (
      <CustomerLayout>
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">{t('errors.notFound')}</p>
          <Link href="/merchants" className="text-primary-accessible hover:underline text-sm">
            {t('merchants.backToList')}
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-4">
        {/* Back link */}
        <Link
          href="/merchants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('merchants.backToList')}
        </Link>

        {/* Header */}
        <div className={textStart}>
          <h1 className="text-2xl font-bold">{merchant.businessName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {formatNumber(merchant.totalCustomers)} {t('merchants.customers')}
            </span>
          </div>
        </div>

        {/* Loyalty Program */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              {t('merchants.loyaltyProgram')}
            </h2>
            <div
              className={`grid gap-3 text-center ${
                merchant.loyaltyConfig.welcomeBonus > 0 ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <div>
                <p className="text-lg font-bold text-primary-accessible">
                  {merchant.loyaltyConfig.pointsPerSAR}
                </p>
                <p className="text-xs text-muted-foreground">{t('merchants.pointsPerSAR')}</p>
              </div>
              {merchant.loyaltyConfig.welcomeBonus > 0 && (
                <div>
                  <p className="text-lg font-bold text-primary-accessible">
                    {merchant.loyaltyConfig.welcomeBonus}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('merchants.welcomeBonus')}</p>
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-primary-accessible">
                  {merchant.loyaltyConfig.redemptionRate}
                </p>
                <p className="text-xs text-muted-foreground">{t('merchants.redemptionRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        {merchant.locations.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t('merchants.locations')} ({merchant.locations.length})
              </h2>
              <div className="space-y-2">
                {merchant.locations.map((loc) => (
                  <div
                    key={loc.locationId}
                    className="text-sm p-2 rounded-lg bg-black/[0.03] space-y-0.5"
                  >
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.address}, {loc.city}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Perks */}
        {merchant.activePerks.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                {t('merchants.perks')} ({merchant.activePerks.length})
              </h2>
              <div className="space-y-2">
                {merchant.activePerks.map((perk) => (
                  <div key={perk.id} className="text-sm p-2 rounded-lg bg-black/[0.03]">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{perk.title}</p>
                      <span className="text-xs text-muted-foreground">{perk.requiredTier}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{perk.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enroll Button */}
        {!isEnrolled && (
          <Button
            className="w-full h-11"
            onClick={handleEnroll}
            disabled={enrollMutation.isPending}
          >
            {enrollMutation.isPending ? t('merchants.joining') : t('merchants.join')}
          </Button>
        )}

        {isEnrolled && (
          <div className="text-center py-2">
            <span className="text-sm text-primary-accessible font-medium">
              {t('merchants.enrolled')}
            </span>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
