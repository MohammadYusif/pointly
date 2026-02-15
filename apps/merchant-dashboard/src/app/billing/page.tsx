'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useMerchant } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { MerchantResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { Check } from 'lucide-react';

const tiers = [
  {
    key: 'BASIC',
    nameAr: 'أساسي',
    nameEn: 'Basic',
    features: {
      ar: ['فرع واحد', 'برنامج ولاء قياسي', 'دعم عبر البريد الإلكتروني'],
      en: ['1 location', 'Standard loyalty program', 'Email support'],
    },
  },
  {
    key: 'PROFESSIONAL',
    nameAr: 'احترافي',
    nameEn: 'Professional',
    features: {
      ar: ['حتى 3 فروع', 'علامة تجارية مخصصة', 'تحليلات متقدمة', 'دعم ذو أولوية'],
      en: ['Up to 3 locations', 'Custom branding', 'Advanced analytics', 'Priority support'],
    },
  },
  {
    key: 'ENTERPRISE',
    nameAr: 'مؤسسي',
    nameEn: 'Enterprise',
    features: {
      ar: ['فروع غير محدودة', 'وصول API كامل', 'علامة بيضاء', 'مدير حساب مخصص'],
      en: ['Unlimited locations', 'Full API access', 'White-label', 'Dedicated account manager'],
    },
  },
];

export default function BillingPage() {
  const { language } = useTranslation();
  const { textStart } = useRTL();
  const { merchant: authMerchant } = useAuth();
  const { data: merchantData, isLoading } = useMerchant();
  const merchant = merchantData as MerchantResponse | undefined;
  const currentTier = merchant?.tier || authMerchant?.tier || 'BASIC';

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-8">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {language === 'ar' ? 'الفوترة' : 'Billing'}
        </h1>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'خطتك الحالية' : 'Current Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold" style={{ color: '#08b0a2' }}>
              {tiers.find((t) => t.key === currentTier)?.[
                language === 'ar' ? 'nameAr' : 'nameEn'
              ] || currentTier}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#08b0a2]/10 text-[#08b0a2]">
              {language === 'ar' ? 'نشط' : 'Active'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {tiers.map((tier) => {
          const isCurrentTier = tier.key === currentTier;
          return (
            <Card key={tier.key} className={isCurrentTier ? 'border-[#08b0a2] border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'ar' ? tier.nameAr : tier.nameEn}</span>
                  {isCurrentTier && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#08b0a2]/10 text-[#08b0a2]">
                      {language === 'ar' ? 'الحالي' : 'Current'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.features[language === 'ar' ? 'ar' : 'en'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-[#08b0a2] shrink-0" />
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
            {language === 'ar' ? 'إدارة الفوترة' : 'Billing Management'}
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
              {language === 'ar' ? 'قريباً' : 'Coming Soon'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {language === 'ar'
              ? 'ستتوفر قريباً إدارة طرق الدفع والفواتير والاستخدام. للترقية أو الاستفسار عن الفوترة، تواصل مع فريق الدعم.'
              : 'Payment methods, invoices, and usage management will be available soon. To upgrade or for billing inquiries, contact our support team.'}
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
