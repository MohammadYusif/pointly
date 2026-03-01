'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { enrollMerchant, getMyMerchants, getPublicMerchants } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerMerchantView, PublicMerchantSummary } from '@pointly/shared';
import { Card, CardContent, useRTL } from '@pointly/ui';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function EnrollPage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  const [merchants, setMerchants] = useState<PublicMerchantSummary[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPublicMerchants(), getMyMerchants()])
      .then(([all, mine]: [PublicMerchantSummary[], CustomerMerchantView[]]) => {
        setMerchants(all);
        setEnrolled(new Set(mine.map((m) => m.merchantId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (merchantId: string) => {
    setEnrolling(merchantId);
    try {
      await enrollMerchant(merchantId);
      setEnrolled((prev) => new Set([...prev, merchantId]));
      toast.success(t('enroll.enrollSuccess'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <CustomerLayout>
      <h1 className={`text-xl font-bold mb-1 ${textStart}`}>{t('enroll.title')}</h1>
      <p className={`text-sm text-muted-foreground mb-4 ${textStart}`}>{t('enroll.subtitle')}</p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('enroll.noMerchants')}</p>
      ) : (
        <div className="space-y-3">
          {merchants.map((m) => {
            const isEnrolled = enrolled.has(m.merchantId);
            const isEnrolling = enrolling === m.merchantId;
            return (
              <Card key={m.merchantId}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{m.businessName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.tier.toLowerCase()}
                    </p>
                  </div>
                  {isEnrolled ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                      {t('enroll.alreadyEnrolled')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnroll(m.merchantId)}
                      disabled={isEnrolling}
                      className="text-xs px-3 py-1 rounded-full font-medium transition-colors disabled:opacity-50"
                      style={{ background: '#08b0a2', color: '#fff' }}
                    >
                      {isEnrolling ? t('enroll.enrolling') : t('enroll.enrollButton')}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}
