'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchant } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { MerchantResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { Check } from 'lucide-react';

// Keep in sync with the landing page pricing plans
// (apps/landing/src/i18n/translations.ts → pricing.plans)
const tiers = [
  {
    key: 'BASIC',
    nameAr: 'أساسي',
    nameEn: 'Basic',
    features: {
      ar: ['فرع واحد', '100 رسالة SMS / شهرياً', 'الوصول إلى شبكة بوينتلي'],
      en: ['1 store location', '100 SMS / month', 'Pointly network access'],
    },
  },
  {
    key: 'PROFESSIONAL',
    nameAr: 'احترافي',
    nameEn: 'Professional',
    features: {
      ar: ['حتى 3 فروع', '500 رسالة SMS / شهرياً', 'الوصول إلى شبكة بوينتلي'],
      en: ['Up to 3 locations', '500 SMS / month', 'Pointly network access'],
    },
  },
  {
    key: 'ENTERPRISE',
    nameAr: 'مؤسسي',
    nameEn: 'Enterprise',
    features: {
      ar: ['فروع غير محدودة', '2,000 رسالة SMS / شهرياً', 'الوصول إلى شبكة بوينتلي'],
      en: ['Unlimited locations', '2,000 SMS / month', 'Pointly network access'],
    },
  },
];

export default function BillingPage() {
  const { t, language } = useTranslation();
  const { textStart } = useRTL();
  const { merchant: authMerchant } = useAuth();
  const { data: merchantData, isLoading } = useMerchant();
  const merchant = merchantData as MerchantResponse | undefined;
  const currentTier = merchant?.tier || authMerchant?.tier || 'BASIC';

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('navigation.billing')}
        </h1>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('billing.currentPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary-accessible">
              {tiers.find((tier) => tier.key === currentTier)?.[
                language === 'ar' ? 'nameAr' : 'nameEn'
              ] || currentTier}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary-accessible">
              {t('common.active')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {tiers.map((tier) => {
          const isCurrentTier = tier.key === currentTier;
          return (
            <Card key={tier.key} className={isCurrentTier ? 'border-primary border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'ar' ? tier.nameAr : tier.nameEn}</span>
                  {isCurrentTier && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary-accessible">
                      {t('billing.current')}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.features[language === 'ar' ? 'ar' : 'en'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('billing.management')}
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
              {t('billing.comingSoon')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('billing.managementDesc')}</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
