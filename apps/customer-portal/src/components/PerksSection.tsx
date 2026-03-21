'use client';

import { useMyPerks } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerPerkView } from '@pointly/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@pointly/ui';
import { useState } from 'react';

const perkTypeKey: Record<string, string> = {
  EARLY_ACCESS: 'perks.earlyAccess',
  EXCLUSIVE_PRODUCT: 'perks.exclusiveProduct',
  EVENT: 'perks.event',
  BIRTHDAY_REWARD: 'perks.birthdayReward',
  SPEND_BONUS: 'perks.spendBonus',
  REFERRAL_BONUS: 'perks.referralBonus',
  HAPPY_HOUR: 'perks.happyHour',
  WIN_BACK: 'perks.winBack',
  WELCOME_OFFER: 'perks.welcomeOffer',
};

const tierKey: Record<string, string> = {
  BRONZE: 'tier.bronze',
  GOLD: 'tier.gold',
  PLATINUM: 'tier.platinum',
  DIAMOND: 'tier.diamond',
};

function PerkItem({
  perk,
  t,
  onClick,
}: {
  perk: CustomerPerkView;
  t: (key: string) => string;
  onClick: () => void;
}) {
  const isExhausted = perk.isExhausted === true;
  const hasMessage = !!perk.campaignMessage;

  return (
    <button
      type="button"
      className={`w-full text-start p-3 rounded-md border transition-opacity ${
        isExhausted
          ? 'border-amber-200 bg-amber-50 opacity-60'
          : perk.isUnlocked
            ? 'border-green-300 bg-green-50'
            : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{perk.title}</p>
          <p className="text-xs text-muted-foreground">{perk.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(perkTypeKey[perk.type] ?? perk.type)} · {perk.merchantName}
          </p>
          {hasMessage && <p className="text-xs text-primary mt-1">{t('perks.tapForDetails')}</p>}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${
            isExhausted
              ? 'bg-amber-100 text-amber-800'
              : perk.isUnlocked
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isExhausted
            ? t('settings.used')
            : perk.isUnlocked
              ? t('perks.available')
              : `${t(tierKey[perk.requiredTier] ?? perk.requiredTier)}+`}
        </span>
      </div>
    </button>
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
  const { t, locale } = useTranslation();
  const { data: perks, isLoading } = useMyPerks();
  const [selectedPerk, setSelectedPerk] = useState<CustomerPerkView | null>(null);

  if (isLoading) return <PerksSkeleton />;
  if (!perks || perks.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('perks.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {perks.map((perk) => (
            <PerkItem key={perk.perkId} perk={perk} t={t} onClick={() => setSelectedPerk(perk)} />
          ))}
        </CardContent>
      </Card>

      <Sheet open={!!selectedPerk} onOpenChange={() => setSelectedPerk(null)}>
        <SheetContent side="bottom">
          {selectedPerk && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedPerk.title}</SheetTitle>
                <SheetDescription>{selectedPerk.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {selectedPerk.campaignMultiplier && (
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {t('perks.multiplierLabel', { multiplier: selectedPerk.campaignMultiplier })}
                  </div>
                )}
                {selectedPerk.campaignMessage && (
                  <p className="text-sm text-foreground">{selectedPerk.campaignMessage}</p>
                )}
                {selectedPerk.campaignEndDate && (
                  <p className="text-sm text-muted-foreground">
                    {t('perks.validUntil', {
                      date: new Date(selectedPerk.campaignEndDate).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                    })}
                  </p>
                )}
                {selectedPerk.campaignMaxUsesPerCustomer &&
                  selectedPerk.campaignMaxUsesPerCustomer > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('perks.usesRemaining', {
                        remaining: selectedPerk.campaignUsesRemaining ?? 0,
                        total: selectedPerk.campaignMaxUsesPerCustomer,
                      })}
                    </p>
                  )}
                {selectedPerk.isExhausted && (
                  <p className="text-sm text-amber-600 font-medium">{t('perks.exhausted')}</p>
                )}
                {selectedPerk.campaignTerms && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                      {t('perks.termsAndConditions')}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedPerk.campaignTerms}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
