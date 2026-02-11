'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useCustomerByPhone, useMerchantCustomers } from '@/hooks/api';
import type { CustomerResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, Input, useRTL } from '@pointly/ui';
import { Search } from 'lucide-react';
import { useState } from 'react';

function getTierColor(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'DIAMOND':
      return 'bg-purple-100 text-purple-800';
    case 'PLATINUM':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function getTierLabel(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'DIAMOND':
      return 'Diamond';
    case 'PLATINUM':
      return 'Platinum';
    default:
      return 'Bronze';
  }
}

/** Format phone: 966501111111 → +966 50 111 1111 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966') && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

export default function CustomersPage() {
  const { t, formatNumber } = useTranslation();
  const { textStart } = useRTL();

  const [searchPhone, setSearchPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customersData, isLoading } = useMerchantCustomers({ limit: 20 });
  const { data: searchResult, isLoading: searchLoading } = useCustomerByPhone(searchQuery);

  const customers = (customersData?.customers || []) as CustomerResponse[];
  const displayCustomers = searchQuery && searchResult ? [searchResult] : customers;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchPhone);
  };

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
          <Card key={customer.customerId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={textStart}>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {formatPhone(customer.phone)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getTierColor(customer.currentTier)}`}
                  >
                    {getTierLabel(customer.currentTier)}
                  </span>
                  <div className="text-end">
                    <p className="font-medium">{formatNumber(customer.globalPointsBalance)}</p>
                    <p className="text-xs text-muted-foreground">{t('common.points')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customersData?.nextToken && !searchQuery && (
        <Button variant="outline" className="w-full mt-4">
          {t('common.viewAll')}
        </Button>
      )}
    </DashboardLayout>
  );
}
