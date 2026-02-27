'use client';

import { ClientDate } from '@/components/ui/ClientDate';
import type { CustomerEnrollment, MerchantScopedCustomerResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone, getTierColor } from '@pointly/shared';
import { Card, CardContent, useRTL } from '@pointly/ui';

interface CustomerSummaryCardProps {
  customer: MerchantScopedCustomerResponse;
  enrollment: CustomerEnrollment | undefined;
}

export function CustomerSummaryCard({ customer, enrollment }: CustomerSummaryCardProps) {
  const { t, formatNumber, locale } = useTranslation();
  const { textStart, textEnd } = useRTL();

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className={textStart}>
            <p className="text-lg font-semibold">{customer.name || customer.customerId}</p>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {formatPhone(customer.phone)}
            </p>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${getTierColor(customer.currentTier)}`}
              style={{
                backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)',
              }}
            >
              {customer.currentTier}
            </span>
          </div>
          <div className={`grid grid-cols-2 gap-x-6 gap-y-2 text-sm ${textEnd}`}>
            <div>
              <p className="text-muted-foreground">{t('common.points')}</p>
              <p className="font-semibold text-lg">
                {formatNumber(enrollment?.merchantPointsBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('customer.lifetimePoints')}</p>
              <p className="font-semibold text-lg">
                {formatNumber(enrollment?.merchantLifetimePoints ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('customer.enrolled')}</p>
              <p className="font-medium">
                {enrollment?.enrolledAt ? (
                  <ClientDate date={enrollment.enrolledAt} format="date" locale={locale} />
                ) : (
                  '-'
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('customer.lastVisit')}</p>
              <p className="font-medium">
                {enrollment?.lastTransactionAt ? (
                  <ClientDate date={enrollment.lastTransactionAt} format="date" locale={locale} />
                ) : (
                  '-'
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
