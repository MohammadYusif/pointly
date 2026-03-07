'use client';

import { useUpdateConsent } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerMerchantView } from '@pointly/shared';
import { useState } from 'react';
import { toast } from 'sonner';

interface ConsentToggleProps {
  merchant: CustomerMerchantView;
}

export function ConsentToggle({ merchant }: ConsentToggleProps) {
  const { t } = useTranslation();
  const consentMutation = useUpdateConsent();
  const [optimisticStatus, setOptimisticStatus] = useState(merchant.consentStatus);

  const isGranted = optimisticStatus === 'GRANTED';
  const isPending = optimisticStatus === 'PENDING';

  const statusLabel = isGranted
    ? t('consent.granted')
    : isPending
      ? t('consent.pending')
      : t('consent.revoked');

  const statusClass = isGranted
    ? 'bg-green-100 text-green-800'
    : isPending
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

  const handleToggle = () => {
    const action = isGranted ? 'revoke' : 'grant';
    const previousStatus = optimisticStatus;
    setOptimisticStatus(action === 'grant' ? 'GRANTED' : 'REVOKED');

    consentMutation.mutate(
      { merchantId: merchant.merchantId, action },
      {
        onSuccess: () => {
          toast.success(
            action === 'grant' ? t('consent.grantSuccess') : t('consent.revokeSuccess'),
          );
        },
        onError: () => {
          setOptimisticStatus(previousStatus);
          toast.error(t('errors.serverError'));
        },
      },
    );
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{merchant.businessName}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
      </div>
      <button
        type="button"
        className="consent-toggle"
        data-state={isGranted ? 'granted' : 'revoked'}
        disabled={consentMutation.isPending}
        onClick={handleToggle}
        aria-label={isGranted ? t('consent.revoke') : t('consent.grant')}
      >
        <span
          className="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: isGranted ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
        />
      </button>
    </div>
  );
}
