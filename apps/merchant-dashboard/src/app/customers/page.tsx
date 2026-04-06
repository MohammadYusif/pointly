'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCustomerByPhone, useCustomerInsights, useInfiniteCustomers } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone } from '@pointly/shared';
import type { MerchantScopedCustomerResponse } from '@pointly/shared';
import { Button, Card, CardContent, Input, useRTL } from '@pointly/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function CustomersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton indices
        <div key={i} className="stagger-item">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

interface CustomerListItem {
  customerId: string;
  name?: string;
  phone: string;
  transactionCount: number;
  merchantPointsBalance: number;
}

/** The /:merchantId/customers endpoint returns a flattened shape (toMerchantCustomerView),
 *  NOT the full CustomerResponse with enrollments[]. Map it directly. */
function toCustomerListItem(c: Record<string, unknown>): CustomerListItem {
  return {
    customerId: (c.customerId as string) ?? '',
    name: c.name as string | undefined,
    phone: (c.phone as string) ?? '',
    transactionCount: (c.transactionCount as number) ?? 0,
    merchantPointsBalance: (c.merchantPointsBalance as number) ?? 0,
  };
}

function toCustomerListItemFromScoped(c: MerchantScopedCustomerResponse): CustomerListItem {
  return {
    customerId: c.customerId,
    name: c.name,
    phone: c.phone,
    transactionCount: c.enrollment?.transactionCount ?? 0,
    merchantPointsBalance: c.enrollment?.merchantPointsBalance ?? 0,
  };
}

export default function CustomersPage() {
  const { t, formatNumber, language } = useTranslation();
  const { textStart } = useRTL();

  const { data: insights } = useCustomerInsights();

  const [searchPhone, setSearchPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: pages,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteCustomers(20);
  const { data: searchResult, isLoading: searchLoading } = useCustomerByPhone(searchQuery);

  const customers =
    pages?.pages.flatMap((p) =>
      (p.customers || []).map((c) => toCustomerListItem(c as unknown as Record<string, unknown>)),
    ) || [];
  const displayCustomers: CustomerListItem[] =
    searchQuery && searchResult
      ? [toCustomerListItemFromScoped(searchResult as MerchantScopedCustomerResponse)]
      : customers;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchPhone);
  };

  useEffect(() => {
    if (error) toast.error(error.message || t('errors.serverError'));
  }, [error, t]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('customer.title')}
        </h1>
      </div>

      {/* Customer Insights */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{insights.birthdayReward.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('perkInsights.birthdayThisMonth')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{insights.winBack.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('perkInsights.inactiveCustomers')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{insights.welcomeOffer.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('perkInsights.newCustomers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{insights.totalCustomers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('perkInsights.totalCustomers')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <Input
          placeholder={t('customer.phone')}
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="max-w-sm"
          dir="ltr"
        />
        <Button type="submit" disabled={searchLoading}>
          <Search className="h-4 w-4" />
        </Button>
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSearchPhone('');
            }}
          >
            {t('common.cancel')}
          </Button>
        )}
      </form>

      {/* Customer List */}
      <div className="space-y-3">
        {isLoading && <CustomersListSkeleton />}
        {!isLoading && displayCustomers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
        )}
        {displayCustomers.map((customer) => (
          <Link
            key={customer.customerId}
            href={`/customers/detail?id=${customer.customerId}`}
            className="block stagger-item"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer card-interactive">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={textStart}>
                    <p className="font-medium">{customer.name || formatPhone(customer.phone)}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {formatPhone(customer.phone)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatNumber(customer.transactionCount)} {t('customer.transactions')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <p className="font-medium">{formatNumber(customer.merchantPointsBalance)}</p>
                      <p className="text-xs text-muted-foreground">{t('common.points')}</p>
                    </div>
                    {language === 'ar' ? (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {hasNextPage && !searchQuery && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
        </Button>
      )}
    </DashboardLayout>
  );
}
