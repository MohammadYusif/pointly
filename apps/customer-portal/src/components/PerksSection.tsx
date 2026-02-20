'use client';

import { getMyPerks } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerPerkView } from '@pointly/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import { useEffect, useState } from 'react';

const perkTypeLabel: Record<string, { en: string; ar: string }> = {
  EARLY_ACCESS: { en: 'Early Access', ar: 'وصول مبكر' },
  EXCLUSIVE_PRODUCT: { en: 'Exclusive Product', ar: 'منتج حصري' },
  EVENT: { en: 'Event', ar: 'فعالية' },
};

const tierLabel: Record<string, { en: string; ar: string }> = {
  BRONZE: { en: 'Bronze', ar: 'برونزي' },
  GOLD: { en: 'Gold', ar: 'ذهبي' },
  PLATINUM: { en: 'Platinum', ar: 'بلاتيني' },
  DIAMOND: { en: 'Diamond', ar: 'ماسي' },
};

function PerkItem({
  perk,
  language,
  t,
}: { perk: CustomerPerkView; language: string; t: (key: string) => string }) {
  const typeInfo = perkTypeLabel[perk.type] ?? { en: perk.type, ar: perk.type };
  const tierInfo = tierLabel[perk.requiredTier] ?? { en: perk.requiredTier, ar: perk.requiredTier };
  return (
    <div
      className={`p-3 rounded-md border ${perk.isUnlocked ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50 dark:bg-gray-900/10 opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{perk.title}</p>
          <p className="text-xs text-muted-foreground">{perk.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'ar' ? typeInfo.ar : typeInfo.en} · {perk.merchantName}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${perk.isUnlocked ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600'}`}
        >
          {perk.isUnlocked
            ? t('perks.available')
            : `${language === 'ar' ? tierInfo.ar : tierInfo.en}+`}
        </span>
      </div>
    </div>
  );
}

export function PerksSection() {
  const { t, language } = useTranslation();
  const [perks, setPerks] = useState<CustomerPerkView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPerks()
      .then(setPerks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || perks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('perks.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {perks.map((perk) => (
          <PerkItem key={perk.perkId} perk={perk} language={language} t={t} />
        ))}
      </CardContent>
    </Card>
  );
}
