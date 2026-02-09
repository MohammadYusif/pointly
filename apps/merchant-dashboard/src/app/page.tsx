'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchantStats, useMerchantTransactions } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
  useRTL,
} from '@pointly/ui';
import { ArrowUpRight, CreditCard, DollarSign, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const { textStart, textEnd, flipIcon } = useRTL();
  const { merchant, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useMerchantStats();
  const { data: txData } = useMerchantTransactions({ limit: 5 });

  const isLoading = authLoading || statsLoading;
  const transactions = (txData?.transactions || []) as TransactionResponse[];

  return (
    <DashboardLayout>
      <div className="mb-6 md:mb-8">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('dashboard.title')}
        </h1>
        <p className={`text-sm md:text-base text-muted-foreground mt-1 ${textStart}`}>
          {merchant?.businessName
            ? t('dashboard.welcome', { name: merchant.businessName })
            : t('dashboard.welcomeMessage')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t('dashboard.totalCustomers')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {isLoading ? '...' : formatNumber(stats?.totalTransactions ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t('dashboard.totalTransactions')}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {isLoading ? '...' : formatNumber(stats?.totalTransactions ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t('dashboard.pointsIssued')}
            </CardTitle>
            <ArrowUpRight className={`h-4 w-4 text-muted-foreground shrink-0 ${flipIcon}`} />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {isLoading ? '...' : formatNumber(stats?.totalPointsEarned ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t('dashboard.totalRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-base md:text-2xl font-bold truncate">
              {isLoading ? '...' : formatCurrency(stats?.averageTransactionValue ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'أحدث معاملات عملائك' : 'Your latest customer transactions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {transactions.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
            )}
            {transactions.map((tx) => (
              <Flex
                key={tx.transactionId}
                justify="between"
                align="center"
                className="p-3 md:p-4 border rounded-lg"
              >
                <div className={textStart}>
                  <p className="font-medium">{tx.customerId}</p>
                  <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                    {new Date(tx.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-SA')}
                  </p>
                </div>
                <div className={textEnd}>
                  <p className="font-medium">{formatCurrency(tx.amount)}</p>
                  <p className="text-sm text-green-600">
                    +{formatNumber(tx.points)} {t('common.points')}
                  </p>
                </div>
              </Flex>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => router.push('/transactions')}
          >
            {t('common.viewAll')} {t('navigation.transactions')}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
