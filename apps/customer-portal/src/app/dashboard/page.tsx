'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { getCustomer, getCustomerTransactions } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerEnrollment, CustomerResponse, TransactionResponse } from '@pointly/shared';
import { getTierColor, getTierTarget, getTypeBadge } from '@pointly/shared';
import { Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { useEffect, useState } from 'react';

interface CustomerProfile extends CustomerResponse {
  tierDisplayName: string;
  pointsToNextTier: number;
  monthsOfInactivity: number;
}

export default function CustomerDashboard() {
  const { t, formatNumber, language, locale } = useTranslation();
  const { textStart } = useRTL();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cust, txData] = await Promise.all([
          getCustomer('me'),
          getCustomerTransactions({ limit: 5 }),
        ]);
        setCustomer(cust as CustomerProfile);
        setTransactions(txData.transactions || []);
      } catch {
        // User may not be authenticated
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <CustomerLayout>
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <p className="text-center text-muted-foreground py-8">{t('errors.unauthorized')}</p>
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
        <div className={textStart}>
          <h1 className="text-xl font-bold">
            {t('dashboard.welcome')} {customer.name || ''}
          </h1>
          <span className={`text-sm font-medium ${getTierColor(customer.currentTier)}`}>
            {customer.tierDisplayName}
          </span>
        </div>

        {/* Point Balances */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: '#08b0a2' }}>
                {formatNumber(customer.globalPointsBalance)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'نقاط Pointly' : 'Pointly Points'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {formatNumber(
                  (customer.enrollments || []).reduce(
                    (sum: number, e: CustomerEnrollment) => sum + (e.merchantPointsBalance || 0),
                    0,
                  ),
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'نقاط التجار' : 'Merchant Points'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress */}
        {tierTarget > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{customer.tierDisplayName}</span>
                <span>{formatNumber(progress)} / {formatNumber(tierTarget)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%`, backgroundColor: '#08b0a2' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(customer.pointsToNextTier || 0)}{' '}
                {language === 'ar' ? 'نقطة للمستوى التالي' : 'points to next tier'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Decay Warning */}
        {customer.monthsOfInactivity >= 3 && customer.globalPointsBalance > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {language === 'ar'
                  ? 'ستبدأ نقاطك بالانتهاء قريباً. قم بعملية شراء لإعادة تعيين نشاطك.'
                  : 'Your points will start expiring soon. Make a purchase to reset your activity.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {language === 'ar' ? 'آخر المعاملات' : 'Recent Transactions'}
            </CardTitle>
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
                <span className={`font-medium ${tx.type === 'EARN' ? 'text-green-600' : 'text-amber-600'}`}>
                  {tx.type === 'EARN' ? '+' : '-'}{formatNumber(tx.points)}
                </span>
              </div>
            );
            })}
          </CardContent>
        </Card>

        {/* Enrolled Merchants */}
        {customer.enrollments?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {language === 'ar' ? 'التجار المسجلين' : 'Enrolled Merchants'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.enrollments.map((e: CustomerEnrollment) => (
                <div key={e.merchantId} className="flex justify-between items-center">
                  <span className="text-sm">{e.merchantId}</span>
                  <span className="font-medium">{formatNumber(e.merchantPointsBalance)} {t('common.points')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}
