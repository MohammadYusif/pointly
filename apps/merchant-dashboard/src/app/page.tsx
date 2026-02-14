'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import {
  type DatePreset,
  DateRangeSelector,
  EarnRedeemBreakdown,
  type GroupBy,
  KPICard,
  LocationSelector,
  RevenueChart,
  TransactionTrendChart,
  getDateRange,
  getDefaultGroupBy,
  isValidGroupBy,
} from '@/components/analytics';
import { useMerchant, useMerchantAnalytics } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@pointly/i18n';
import { useRTL } from '@pointly/ui';
import { ArrowUpRight, CreditCard, DollarSign, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const { textStart, flipIcon } = useRTL();
  const { merchant: authMerchant, isLoading: authLoading } = useAuth();

  const [preset, setPreset] = useState<DatePreset>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [locationId, setLocationId] = useState<string | undefined>(undefined);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (!isValidGroupBy(newPreset, groupBy)) {
      setGroupBy(getDefaultGroupBy(newPreset));
    }
  };

  const { startDate, endDate } = useMemo(() => getDateRange(preset), [preset]);

  const { data: merchantData, error: merchantError } = useMerchant();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error,
  } = useMerchantAnalytics({
    startDate,
    endDate,
    groupBy,
    locationId,
  });

  useEffect(() => {
    const err = error || merchantError;
    if (err) toast.error(err.message || t('errors.serverError'));
  }, [error, merchantError, t]);

  const isLoading = authLoading || analyticsLoading;
  const locations = merchantData?.locations || [];
  const summary = analytics?.summary;
  const dataPoints = analytics?.trends || [];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('dashboard.title')}
        </h1>
        <p className={`text-sm md:text-base text-muted-foreground mt-1 ${textStart}`}>
          {authMerchant?.businessName
            ? t('dashboard.welcome', { name: authMerchant.businessName })
            : t('dashboard.welcomeMessage')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DateRangeSelector
          preset={preset}
          groupBy={groupBy}
          onPresetChange={handlePresetChange}
          onGroupByChange={setGroupBy}
        />
        <LocationSelector locations={locations} selected={locationId} onChange={setLocationId} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <KPICard
          title={t('dashboard.totalRevenue')}
          value={formatCurrency(summary?.totalRevenue ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title={t('dashboard.totalTransactions')}
          value={formatNumber(summary?.totalTransactions ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title={t('dashboard.pointsIssued')}
          value={formatNumber(summary?.totalPointsEarned ?? 0)}
          icon={<ArrowUpRight className={`h-4 w-4 ${flipIcon}`} />}
          loading={isLoading}
        />
        <KPICard
          title={language === 'ar' ? 'عملاء فريدون' : 'Unique Customers'}
          value={formatNumber(summary?.uniqueCustomers ?? 0)}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2 mb-6">
        <RevenueChart data={dataPoints} loading={isLoading} />
        <TransactionTrendChart data={dataPoints} loading={isLoading} />
      </div>

      {/* Points Breakdown */}
      <div className="mb-6">
        <EarnRedeemBreakdown data={dataPoints} loading={isLoading} />
      </div>

      {/* Location Summary for multi-location merchants */}
      {locations.length > 1 && !locationId && <LocationSummary locations={locations} />}
    </DashboardLayout>
  );
}

function LocationSummary({
  locations,
}: {
  locations: { locationId: string; name: string; city: string; isActive: boolean }[];
}) {
  const { language } = useTranslation();

  const activeLocations = locations.filter((l) => l.isActive);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{language === 'ar' ? 'الفروع' : 'Locations'}</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {activeLocations.map((loc) => (
          <div
            key={loc.locationId}
            className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
          >
            <p className="font-medium">{loc.name}</p>
            <p className="text-sm text-muted-foreground">{loc.city}</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
              {language === 'ar' ? 'نشط' : 'Active'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
