'use client';

import { LocationSelector } from '@/components/analytics';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchant, useMerchantTransactions } from '@/hooks/api';
import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, useRTL } from '@pointly/ui';
import { useState } from 'react';

function getTypeBadge(type: string): { label: string; className: string } {
  switch (type) {
    case 'EARN':
      return { label: 'Earn', className: 'bg-green-100 text-green-800' };
    case 'REDEEM':
      return { label: 'Redeem', className: 'bg-orange-100 text-orange-800' };
    case 'ADJUSTMENT':
      return { label: 'Adjust', className: 'bg-blue-100 text-blue-800' };
    case 'EXPIRATION':
      return { label: 'Expired', className: 'bg-red-100 text-red-800' };
    default:
      return { label: type, className: 'bg-gray-100 text-gray-800' };
  }
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-green-100 text-green-800' };
    case 'PENDING':
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
    case 'FAILED':
      return { label: 'Failed', className: 'bg-red-100 text-red-800' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800' };
  }
}

export default function TransactionsPage() {
  const { t, formatCurrency, formatNumber, language } = useTranslation();
  const { textStart, textEnd } = useRTL();
  const [locationId, setLocationId] = useState<string | undefined>(undefined);

  const { data: merchantData } = useMerchant();
  const { data: txData, isLoading } = useMerchantTransactions({ limit: 50, locationId });
  const transactions = (txData?.transactions || []) as TransactionResponse[];
  const locations = merchantData?.locations || [];

  // Build a locationId -> name map for display
  const locationNames: Record<string, string> = {};
  for (const loc of locations) {
    locationNames[loc.locationId] = loc.name;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('transaction.title')}
        </h1>
        <LocationSelector
          locations={locations}
          selected={locationId}
          onChange={setLocationId}
        />
      </div>

      <div className="space-y-3">
        {isLoading && (
          <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
        )}
        {!isLoading && transactions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
        )}
        {transactions.map((tx) => {
          const typeBadge = getTypeBadge(tx.type);
          const statusBadge = getStatusBadge(tx.status);
          return (
            <Card key={tx.transactionId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={textStart}>
                    <p className="font-medium text-sm">{tx.customerId}</p>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-SA')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge.className}`}>
                        {typeBadge.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                      {tx.locationId && locationNames[tx.locationId] && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {locationNames[tx.locationId]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={textEnd}>
                    <p className="font-medium">{formatCurrency(tx.amount)}</p>
                    <p
                      className={`text-sm ${tx.type === 'EARN' ? 'text-green-600' : 'text-orange-600'}`}
                    >
                      {tx.type === 'EARN' ? '+' : '-'}
                      {formatNumber(tx.points)} {t('common.points')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
