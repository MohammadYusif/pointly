'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApproveConsent, usePendingConsents } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { Check, ShieldQuestion, X } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

function ConsentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton indices
        <div key={i} className="stagger-item">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export default function ConsentsPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  const { data: customers, isLoading, error } = usePendingConsents();
  const approveConsent = useApproveConsent();

  useEffect(() => {
    if (error) toast.error(error.message || t('errors.serverError'));
  }, [error, t]);

  const handleAction = (customerId: string, action: 'approve' | 'deny') => {
    approveConsent.mutate(
      { customerId, action },
      {
        onSuccess: () => {
          toast.success(
            action === 'approve' ? t('consent.approveSuccess') : t('consent.denySuccess'),
          );
        },
        onError: (err) => {
          toast.error(err.message || t('errors.serverError'));
        },
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('consent.pendingTitle')}
        </h1>
        <p className={`text-sm text-muted-foreground mt-1 ${textStart}`}>
          {t('consent.pendingDescription')}
        </p>
      </div>

      <div className="space-y-3">
        {isLoading && <ConsentsSkeleton />}

        {!isLoading && (!customers || customers.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('consent.noPending')}</p>
            </CardContent>
          </Card>
        )}

        {customers?.map((customer) => (
          <div key={customer.customerId} className="stagger-item">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={textStart}>
                    <p className="font-medium">{customer.name || customer.customerId}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {formatPhone(customer.phone)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(customer.customerId, 'approve')}
                      disabled={approveConsent.isPending}
                      className="gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('consent.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(customer.customerId, 'deny')}
                      disabled={approveConsent.isPending}
                      className="gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('consent.deny')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
