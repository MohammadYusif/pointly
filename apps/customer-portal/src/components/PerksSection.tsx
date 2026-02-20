'use client';

import { getMyPerks } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerPerkView } from '@pointly/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import { useEffect, useState } from 'react';

const perkTypeKey: Record<string, string> = {
  EARLY_ACCESS: 'perks.earlyAccess',
  EXCLUSIVE_PRODUCT: 'perks.exclusiveProduct',
  EVENT: 'perks.event',
};

const tierKey: Record<string, string> = {
  BRONZE: 'tier.bronze',
  GOLD: 'tier.gold',
  PLATINUM: 'tier.platinum',
  DIAMOND: 'tier.diamond',
};

function PerkItem({ perk, t }: { perk: CustomerPerkView; t: (key: string) => string }) {
  return (
    <div
      className={`p-3 rounded-md border ${perk.isUnlocked ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-gray-50 dark:bg-gray-900/10 opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{perk.title}</p>
          <p className="text-xs text-muted-foreground">{perk.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(perkTypeKey[perk.type] ?? perk.type)} · {perk.merchantName}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${perk.isUnlocked ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600'}`}
        >
          {perk.isUnlocked
            ? t('perks.available')
            : `${t(tierKey[perk.requiredTier] ?? perk.requiredTier)}+`}
        </span>
      </div>
    </div>
  );
}

export function PerksSection() {
  const { t } = useTranslation();
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
          <PerkItem key={perk.perkId} perk={perk} t={t} />
        ))}
      </CardContent>
    </Card>
  );
}
