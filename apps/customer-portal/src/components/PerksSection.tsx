'use client';

import { useMyPerks } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerPerkView } from '@pointly/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';

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
      className={`p-3 rounded-md border ${perk.isUnlocked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
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
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${perk.isUnlocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
        >
          {perk.isUnlocked
            ? t('perks.available')
            : `${t(tierKey[perk.requiredTier] ?? perk.requiredTier)}+`}
        </span>
      </div>
    </div>
  );
}

function PerksSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-24 skeleton" />
      </CardHeader>
      <CardContent className="space-y-3">
        {['s1', 's2'].map((k) => (
          <div key={k} className="h-16 w-full skeleton" />
        ))}
      </CardContent>
    </Card>
  );
}

export function PerksSection() {
  const { t } = useTranslation();
  const { data: perks, isLoading } = useMyPerks();

  if (isLoading) return <PerksSkeleton />;
  if (!perks || perks.length === 0) return null;

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
