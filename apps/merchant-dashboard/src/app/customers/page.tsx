'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useCustomerByPhone, useInfiniteCustomers } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, Input, useRTL } from '@pointly/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface MerchantCustomerView {
  customerId: string;
  phone: string;
  name?: string;
  status: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  enrolledAt?: string;
  lastTransactionAt?: string;
}

export default function CustomersPage() {
  const { t, formatNumber, language } = useTranslation();
  const { textStart } = useRTL();

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

  const customers = (pages?.pages.flatMap((p) => p.customers || []) ||
    []) as unknown as MerchantCustomerView[];
  const displayCustomers =
    searchQuery && searchResult ? [searchResult as unknown as MerchantCustomerView] : customers;

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
        {isLoading && (
          <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
        )}
        {!isLoading && displayCustomers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
        )}
        {displayCustomers.map((customer) => (
          <Link
            key={customer.customerId}
            href={`/customers/detail?id=${customer.customerId}`}
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={textStart}>
                    <p className="font-medium">{customer.name || customer.customerId}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {formatPhone(customer.phone)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatNumber(customer.transactionCount)}{' '}
                      {language === 'ar' ? 'عملية' : 'transactions'}
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
          {isFetchingNextPage
            ? t('common.loading')
            : language === 'ar'
              ? 'تحميل المزيد'
              : 'Load More'}
        </Button>
      )}
    </DashboardLayout>
  );
}
