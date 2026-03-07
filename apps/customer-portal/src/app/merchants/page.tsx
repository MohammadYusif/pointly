'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { MerchantCard } from '@/components/MerchantCard';
import { useEnrollMerchant, useMyMerchants, usePublicMerchants } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { Input, useRTL } from '@pointly/ui';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function MerchantsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 skeleton" />
      <div className="h-4 w-48 skeleton" />
      <div className="h-10 skeleton rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function MerchantsPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  const { data: merchants, isLoading: merchantsLoading } = usePublicMerchants();
  const { data: myMerchants, isLoading: myLoading } = useMyMerchants();
  const enrollMutation = useEnrollMerchant();

  const [search, setSearch] = useState('');

  const enrolledSet = useMemo(() => {
    if (!myMerchants) return new Set<string>();
    return new Set(myMerchants.map((m) => m.merchantId));
  }, [myMerchants]);

  const filtered = useMemo(() => {
    if (!merchants) return [];
    if (!search.trim()) return merchants;
    const q = search.toLowerCase();
    return merchants.filter((m) => m.businessName.toLowerCase().includes(q));
  }, [merchants, search]);

  const handleEnroll = (merchantId: string) => {
    enrollMutation.mutate(merchantId, {
      onSuccess: () => toast.success(t('merchants.joinSuccess')),
    });
  };

  const isLoading = merchantsLoading || myLoading;

  if (isLoading) {
    return (
      <CustomerLayout>
        <MerchantsSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <div className={textStart}>
          <h1 className="text-xl font-bold">{t('merchants.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('merchants.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t('merchants.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Merchant Grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('merchants.noResults')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((m) => (
              <MerchantCard
                key={m.merchantId}
                merchant={m}
                isEnrolled={enrolledSet.has(m.merchantId)}
                onEnroll={() => handleEnroll(m.merchantId)}
                isEnrolling={enrollMutation.isPending && enrollMutation.variables === m.merchantId}
              />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
