'use client';

import { useTranslation } from '@pointly/i18n';

function multiplierPart(multiplier: string): string | null {
  const mult = Number.parseFloat(multiplier);
  return !Number.isNaN(mult) && mult > 0 ? `Earn ${mult}x points on your purchases` : null;
}

function minPurchasePart(minPurchase: string): string | null {
  const minP = Number.parseFloat(minPurchase);
  return !Number.isNaN(minP) && minP > 0 ? `Minimum purchase: ${minP} SAR` : null;
}

function maxUsesPart(maxUses: string): string | null {
  const maxU = Number.parseInt(maxUses, 10);
  return !Number.isNaN(maxU) && maxU > 0
    ? `Limited to ${maxU} ${maxU === 1 ? 'use' : 'uses'} per customer`
    : null;
}

function maxPointsPart(maxPoints: string): string | null {
  const maxP = Number.parseInt(maxPoints, 10);
  return !Number.isNaN(maxP) && maxP > 0 ? `Maximum ${maxP} bonus points per transaction` : null;
}

function endDatePart(endDate: string): string | null {
  if (!endDate) return null;
  const endD = new Date(endDate);
  if (Number.isNaN(endD.getTime())) return null;
  return `Valid until ${endD.toLocaleDateString('en-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function buildTermsParts(
  multiplier: string,
  minPurchase: string,
  maxUses: string,
  maxPoints: string,
  endDate: string,
): string[] {
  return [
    multiplierPart(multiplier),
    minPurchasePart(minPurchase),
    maxUsesPart(maxUses),
    maxPointsPart(maxPoints),
    endDatePart(endDate),
  ].filter((p): p is string => p !== null);
}
import { Input, Textarea } from '@pointly/ui';
import { Gift, Users } from 'lucide-react';
import { useMemo } from 'react';
import { ALL_TIERS, TIER_STYLES } from './constants';

interface CampaignFormFieldsProps {
  isCustom?: boolean;
  customName?: string;
  setCustomName?: (v: string) => void;
  customDesc?: string;
  setCustomDesc?: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  multiplier: string;
  setMultiplier: (v: string) => void;
  selectedTiers: string[];
  setSelectedTiers: (v: string[]) => void;
  maxUses: string;
  setMaxUses: (v: string) => void;
  minPurchase: string;
  setMinPurchase: (v: string) => void;
  maxPoints: string;
  setMaxPoints: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  winBackDays?: string;
  setWinBackDays?: (v: string) => void;
  welcomeDays?: string;
  setWelcomeDays?: (v: string) => void;
  lastVisitDays?: string;
  setLastVisitDays?: (v: string) => void;
  tierBreakdown?: Record<string, number>;
  showTypeSpecificHint?: string;
}

export function CampaignFormFields({
  isCustom,
  customName,
  setCustomName,
  customDesc,
  setCustomDesc,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  multiplier,
  setMultiplier,
  selectedTiers,
  setSelectedTiers,
  maxUses,
  setMaxUses,
  minPurchase,
  setMinPurchase,
  maxPoints,
  setMaxPoints,
  message,
  setMessage,
  winBackDays,
  setWinBackDays,
  welcomeDays,
  setWelcomeDays,
  lastVisitDays,
  setLastVisitDays,
  tierBreakdown,
  showTypeSpecificHint,
}: CampaignFormFieldsProps) {
  const { t } = useTranslation();

  const termsPreview = useMemo(() => {
    const parts = buildTermsParts(multiplier, minPurchase, maxUses, maxPoints, endDate);
    return parts.length > 0 ? `${parts.join('. ')}.` : '';
  }, [multiplier, minPurchase, maxUses, maxPoints, endDate]);

  const toggleTier = (tier: string) => {
    setSelectedTiers(
      selectedTiers.includes(tier)
        ? selectedTiers.filter((t) => t !== tier)
        : [...selectedTiers, tier],
    );
  };

  return (
    <div className="space-y-4">
      {isCustom && setCustomName && setCustomDesc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder={t('campaigns.namePlaceholder')}
            value={customName ?? ''}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <Input
            placeholder={t('campaigns.descriptionPlaceholder')}
            value={customDesc ?? ''}
            onChange={(e) => setCustomDesc(e.target.value)}
          />
        </div>
      )}

      {showTypeSpecificHint && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary-accessible">
          <Gift className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{showTypeSpecificHint}</p>
        </div>
      )}

      {setWinBackDays !== undefined && (
        <div>
          <label
            htmlFor="win-back-days"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.winBackDays')}
          </label>
          <Input
            id="win-back-days"
            type="number"
            min="1"
            max="365"
            placeholder="60"
            value={winBackDays ?? ''}
            onChange={(e) => setWinBackDays(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('campaigns.winBackDaysHint')}</p>
        </div>
      )}

      {setWelcomeDays !== undefined && (
        <div>
          <label
            htmlFor="welcome-days"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.welcomeDays')}
          </label>
          <Input
            id="welcome-days"
            type="number"
            min="1"
            max="365"
            placeholder="30"
            value={welcomeDays ?? ''}
            onChange={(e) => setWelcomeDays(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('campaigns.welcomeDaysHint')}</p>
        </div>
      )}

      {setLastVisitDays !== undefined && (
        <div>
          <label
            htmlFor="last-visit-days"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.lastVisitDays')}
          </label>
          <Input
            id="last-visit-days"
            type="number"
            min="1"
            max="365"
            placeholder="—"
            value={lastVisitDays ?? ''}
            onChange={(e) => setLastVisitDays(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('campaigns.lastVisitDaysHint')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border rounded-xl bg-muted/20">
        <div>
          <label
            htmlFor="start-date"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.startDate')}
          </label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="end-date"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.endDate')}
          </label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="multiplier"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.multiplier')}
          </label>
          <Input
            id="multiplier"
            type="number"
            min="1"
            max="5"
            step="0.5"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('campaigns.targetTiers')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedTiers(selectedTiers.length === ALL_TIERS.length ? [] : [...ALL_TIERS])
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${
              selectedTiers.length === ALL_TIERS.length
                ? 'border-primary bg-primary/10 text-primary-accessible font-medium shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {t('campaigns.allTiers')}
          </button>
          {ALL_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => toggleTier(tier)}
              className={`px-3 py-1.5 text-sm border rounded-lg transition-all font-medium ${
                selectedTiers.includes(tier)
                  ? `${TIER_STYLES[tier] ?? ''} shadow-sm`
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {t(`tier.${tier.toLowerCase()}`)}
            </button>
          ))}
        </div>
        {tierBreakdown && selectedTiers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('campaigns.reachPrefix')}{' '}
            <span className="font-semibold text-foreground">
              {selectedTiers.reduce(
                (sum, tier) =>
                  sum + ((tierBreakdown[tier as keyof typeof tierBreakdown] as number) ?? 0),
                0,
              )}
            </span>{' '}
            {t('campaigns.totalReach')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 p-4 border rounded-xl bg-muted/20">
        <div>
          <label
            htmlFor="max-uses"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.maxUsesShort')}
          </label>
          <Input
            id="max-uses"
            type="number"
            min="0"
            max="1000"
            placeholder={t('campaigns.maxUsesHint')}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="min-purchase"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.minPurchaseShort')}
          </label>
          <Input
            id="min-purchase"
            type="number"
            min="0"
            step="0.01"
            placeholder={t('campaigns.minPurchaseHint')}
            value={minPurchase}
            onChange={(e) => setMinPurchase(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="max-points"
            className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
          >
            {t('campaigns.maxPointsShort')}
          </label>
          <Input
            id="max-points"
            type="number"
            min="0"
            placeholder={t('campaigns.maxPointsHint')}
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value)}
          />
        </div>
      </div>

      {termsPreview && (
        <div className="p-3 border rounded-xl bg-secondary/5 border-secondary/20">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-1">
            {t('campaigns.termsPreview')}
          </p>
          <p className="text-sm text-muted-foreground">{termsPreview}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="campaign-message"
          className="text-xs font-medium text-muted-foreground block mb-1.5 uppercase tracking-wide"
        >
          {t('campaigns.messagePlaceholder')} ({t('common.optional')})
        </label>
        <Textarea
          id="campaign-message"
          placeholder={t('campaigns.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
