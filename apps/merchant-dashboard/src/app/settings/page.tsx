'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchant } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { MerchantResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';

export default function SettingsPage() {
  const { t, formatNumber } = useTranslation();
  const { textStart } = useRTL();
  const { merchant: authMerchant } = useAuth();

  const { data: merchantData, isLoading } = useMerchant();
  const merchant = merchantData as MerchantResponse | undefined;

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('settings.title')}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('merchant.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('merchant.name')}</p>
              <p className="font-medium">{merchant?.businessName || authMerchant?.businessName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('auth.email')}</p>
              <p className="font-medium" dir="ltr">
                {merchant?.email || authMerchant?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customer.phone')}</p>
              <p className="font-medium" dir="ltr">
                {merchant?.phone}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('merchant.tier')}</p>
              <p className="font-medium">{merchant?.tier || authMerchant?.tier}</p>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Config */}
        <Card>
          <CardHeader>
            <CardTitle>{t('navigation.loyalty')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('merchant.pointsRate')}</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.pointsPerSAR ?? '-'} {t('common.points')} / SAR
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.pointsRate')}</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.globalPointsPerSAR ?? '-'} {t('common.points')} / SAR
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transaction.amount')} (min)</p>
              <p className="font-medium">{merchant?.loyaltyConfig?.minimumPurchase ?? '-'} SAR</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Redemption Rate</p>
              <p className="font-medium">
                {merchant?.loyaltyConfig?.redemptionRate ?? '-'} SAR / {t('common.points')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SMS Quota */}
        <Card>
          <CardHeader>
            <CardTitle>SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Used</p>
              <p className="font-medium">
                {formatNumber(merchant?.smsQuota?.used ?? 0)} /{' '}
                {formatNumber(merchant?.smsQuota?.limit ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalCustomers')}</p>
              <p className="font-medium">{formatNumber(merchant?.totalCustomers ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalTransactions')}</p>
              <p className="font-medium">{formatNumber(merchant?.totalTransactions ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
