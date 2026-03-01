'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { PerksSection } from '@/components/PerksSection';
import { getCustomer, getCustomerTransactions } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerEnrollment, CustomerResponse, TransactionResponse } from '@pointly/shared';
import { getTierColor, getTierTarget, getTypeBadge } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { useCallback, useEffect, useState } from 'react';

interface CustomerProfile extends CustomerResponse {
  tierDisplayName: string;
  pointsToNextTier: number;
  monthsOfInactivity: number;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {['global', 'merchant'].map((k) => (
          <Card key={k}>
            <CardContent className="p-4 text-center space-y-2">
              <div className="h-8 w-16 mx-auto rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-24 mx-auto rounded-md bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {['tx-a', 'tx-b', 'tx-c'].map((k) => (
            <div key={k} className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDashboard() {
  const { t, formatNumber, locale } = useTranslation();
  const { textStart } = useRTL();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [cust, txData] = await Promise.all([
        getCustomer('me'),
        getCustomerTransactions({ limit: 5 }),
      ]);
      setCustomer(cust as CustomerProfile);
      setTransactions(txData.transactions || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <CustomerLayout>
        <DashboardSkeleton />
      </CustomerLayout>
    );
  }

  if (error || !customer) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <Button variant="outline" onClick={load} size="sm">
            {t('auth.statsRetry')}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const tierTarget = getTierTarget(customer.currentTier);
  const progress = customer.monthlyProgress || 0;
  const progressPercent = tierTarget > 0 ? Math.min(100, (progress / tierTarget) * 100) : 100;

  return (
    <CustomerLayout>
      <div className="space-y-4">
        {/* Welcome */}
        <div className={`stagger-item ${textStart}`}>
          <h1 className="text-xl font-bold">
            {t('dashboard.welcome')} {customer.name || ''}
          </h1>
          <span className={`text-sm font-medium ${getTierColor(customer.currentTier)}`}>
            {customer.tierDisplayName}
          </span>
        </div>

        {/* Point Balances */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="stagger-item">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: '#08b0a2' }}>
                {formatNumber(customer.globalPointsBalance)}
              </p>
              <p className="text-xs text-muted-foreground">{t('dashboard.pointlyPoints')}</p>
            </CardContent>
          </Card>
          <Card className="stagger-item">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {formatNumber(
                  (customer.enrollments || []).reduce(
                    (sum: number, e: CustomerEnrollment) => sum + (e.merchantPointsBalance || 0),
                    0,
                  ),
                )}
              </p>
              <p className="text-xs text-muted-foreground">{t('dashboard.merchantPoints')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress */}
        {tierTarget > 0 && (
          <Card className="stagger-item">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{customer.tierDisplayName}</span>
                <span>
                  {formatNumber(progress)} / {formatNumber(tierTarget)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, backgroundColor: '#08b0a2' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(customer.pointsToNextTier || 0)} {t('dashboard.pointsToNextTier')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Points Expiry Card */}
        {customer.nextDecayDate &&
          customer.globalPointsBalance > 0 &&
          (() => {
            const daysToExpiry = Math.floor(
              (new Date(customer.nextDecayDate).getTime() - Date.now()) / 86400000,
            );
            const isUrgent = daysToExpiry < 30;
            if (daysToExpiry > 365) return null;
            return (
              <Card
                className={`stagger-item ${
                  isUrgent
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                    : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                }`}
              >
                <CardContent className="p-4">
                  <p
                    className={`text-sm ${isUrgent ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}
                  >
                    {daysToExpiry <= 0
                      ? t('expiry.pointsExpireToday')
                      : `${t('expiry.pointsExpireIn')} ${daysToExpiry} ${daysToExpiry === 1 ? t('expiry.day') : t('expiry.days')}. ${t('expiry.resetHint')}`}
                  </p>
                </CardContent>
              </Card>
            );
          })()}

        {/* Recent Transactions */}
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            )}
            {transactions.map((tx) => {
              const badge = getTypeBadge(tx.type);
              return (
                <div key={tx.transactionId} className="flex justify-between items-center">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${tx.type === 'EARN' ? 'text-green-600' : 'text-amber-600'}`}
                  >
                    {tx.type === 'EARN' ? '+' : '-'}
                    {formatNumber(tx.points)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Enrolled Merchants */}
        {customer.enrollments?.length > 0 && (
          <Card className="stagger-item">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.enrolledMerchants')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.enrollments.map((e: CustomerEnrollment) => (
                <div key={e.merchantId} className="flex justify-between items-center">
                  <span className="text-sm">{e.merchantId}</span>
                  <span className="font-medium">
                    {formatNumber(e.merchantPointsBalance)} {t('common.points')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* VIP Perks */}
        <PerksSection />
      </div>
    </CustomerLayout>
  );
}
