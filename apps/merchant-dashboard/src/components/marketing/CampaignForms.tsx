'use client';

import { useCreateCampaign, useTierBreakdown, useUpdateCampaign } from '@/hooks/api';
import type { CampaignResponse, CampaignType } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button } from '@pointly/ui';
import { ChevronUp, Edit2, Megaphone, Smartphone, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CampaignStatusBadge,
  CampaignTypeBadge,
  MultiplierBadge,
  TierBadges,
} from './CampaignBadges';
import { CampaignFormFields } from './CampaignFormFields';
import {
  ALL_TIERS,
  CAMPAIGN_DEFAULTS,
  CAMPAIGN_TYPE_META,
  buildLimitsPayload,
  getCampaignStatus,
  getDefaultDates,
} from './constants';
import type { PlatformFilter } from './constants';

/* ------------------------------------------------------------------ */
/*  Type Selector Grid                                                 */
/* ------------------------------------------------------------------ */

export function CampaignTypeSelector({
  selectedType,
  onSelect,
}: {
  selectedType: CampaignType | null;
  onSelect: (type: CampaignType) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {t('campaigns.selectType')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {CAMPAIGN_TYPE_META.map((meta) => {
          const { Icon } = meta;
          return (
            <button
              key={meta.type}
              type="button"
              onClick={() => onSelect(meta.type)}
              className={`p-3 border rounded-xl text-left transition-all group hover:border-primary/40 ${
                selectedType === meta.type
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                  : 'border-border bg-background'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${meta.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold leading-tight">{t(meta.labelKey)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Campaign Form helpers                                       */
/* ------------------------------------------------------------------ */

function buildCreatePayload(args: {
  type: CampaignType;
  startDate: string;
  endDate: string;
  multiplier: string;
  message: string;
  isCustom: boolean;
  customName: string;
  customDesc: string;
  selectedTiers: string[];
  enablePush: boolean;
  platformFilter: PlatformFilter;
  winBackDays: string;
  welcomeDays: string;
  lastVisitDays: string;
  maxUses: string;
  minPurchase: string;
  maxPoints: string;
}): Record<string, unknown> {
  const {
    type,
    startDate,
    endDate,
    multiplier,
    message,
    isCustom,
    customName,
    customDesc,
    selectedTiers,
    enablePush,
    platformFilter,
    winBackDays,
    welcomeDays,
    lastVisitDays,
    maxUses,
    minPurchase,
    maxPoints,
  } = args;
  const payload: Record<string, unknown> = {
    type,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    multiplier: Number.parseFloat(multiplier),
  };
  if (message.trim()) payload.message = message.trim();
  if (isCustom && customName.trim()) payload.name = customName.trim();
  if (isCustom && customDesc.trim()) payload.description = customDesc.trim();
  if (selectedTiers.length < ALL_TIERS.length) payload.targetTiers = selectedTiers;
  if (enablePush && platformFilter !== 'all') payload.platformFilter = platformFilter;
  return {
    ...payload,
    ...buildCampaignTypePayload(type, winBackDays, welcomeDays, lastVisitDays),
    ...buildLimitsPayload(maxUses, minPurchase, maxPoints),
  };
}

/* ------------------------------------------------------------------ */
/*  Create Campaign Form                                               */
/* ------------------------------------------------------------------ */

export function CreateCampaignForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createCampaign = useCreateCampaign();

  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [message, setMessage] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState('2');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([...ALL_TIERS]);
  const [maxUses, setMaxUses] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [winBackDays, setWinBackDays] = useState('60');
  const [welcomeDays, setWelcomeDays] = useState('30');
  const [lastVisitDays, setLastVisitDays] = useState('');
  const [enablePush, setEnablePush] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const { data: tierBreakdown } = useTierBreakdown();
  const isCustom = selectedType === 'CUSTOM';

  useEffect(() => {
    if (!selectedType || selectedType === 'CUSTOM') return;
    const defaults = CAMPAIGN_DEFAULTS[selectedType];
    if (!defaults) return;
    const dates = getDefaultDates(defaults.durationDays);
    setStartDate(dates.start);
    setEndDate(dates.end);
    setMultiplier(String(defaults.multiplier));
  }, [selectedType]);

  const handleCreate = async () => {
    if (!selectedType) return;
    const mult = Number.parseFloat(multiplier);
    if (mult < 1 || mult > 5) {
      toast.error(t('campaigns.multiplierError'));
      return;
    }
    if (!startDate || !endDate || endDate <= startDate) {
      toast.error(t('campaigns.dateError'));
      return;
    }
    if (selectedTiers.length === 0) {
      toast.error(t('campaigns.tierRequired'));
      return;
    }
    try {
      const payload = buildCreatePayload({
        type: selectedType,
        startDate,
        endDate,
        multiplier,
        message,
        isCustom,
        customName,
        customDesc,
        selectedTiers,
        enablePush,
        platformFilter,
        winBackDays,
        welcomeDays,
        lastVisitDays,
        maxUses,
        minPurchase,
        maxPoints,
      });
      await createCampaign.mutateAsync(payload as Parameters<typeof createCampaign.mutateAsync>[0]);
      toast.success(t('campaigns.createSuccess'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <div className="border rounded-xl bg-muted/10 overflow-hidden">
      <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">{t('campaigns.createCampaign')}</p>
      </div>
      <div className="p-5 space-y-5">
        <CampaignTypeSelector selectedType={selectedType} onSelect={setSelectedType} />

        {selectedType && (
          <CampaignFormFields
            isCustom={isCustom}
            customName={customName}
            setCustomName={setCustomName}
            customDesc={customDesc}
            setCustomDesc={setCustomDesc}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            multiplier={multiplier}
            setMultiplier={setMultiplier}
            selectedTiers={selectedTiers}
            setSelectedTiers={setSelectedTiers}
            maxUses={maxUses}
            setMaxUses={setMaxUses}
            minPurchase={minPurchase}
            setMinPurchase={setMinPurchase}
            maxPoints={maxPoints}
            setMaxPoints={setMaxPoints}
            message={message}
            setMessage={setMessage}
            winBackDays={selectedType === 'WIN_BACK' ? winBackDays : undefined}
            setWinBackDays={selectedType === 'WIN_BACK' ? setWinBackDays : undefined}
            welcomeDays={selectedType === 'WELCOME' ? welcomeDays : undefined}
            setWelcomeDays={selectedType === 'WELCOME' ? setWelcomeDays : undefined}
            lastVisitDays={
              selectedType !== 'WIN_BACK' && selectedType !== 'WELCOME' ? lastVisitDays : undefined
            }
            setLastVisitDays={
              selectedType !== 'WIN_BACK' && selectedType !== 'WELCOME'
                ? setLastVisitDays
                : undefined
            }
            tierBreakdown={tierBreakdown as Record<string, number> | undefined}
            showTypeSpecificHint={getCampaignTypeHint(selectedType, winBackDays, welcomeDays, t)}
          />
        )}

        {selectedType && (
          <div className="p-4 border rounded-xl bg-muted/20 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePush}
                onChange={(e) => setEnablePush(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('notifications.enablePush')}</span>
            </label>
            {enablePush && (
              <div className="flex flex-wrap gap-2 ps-6">
                {(['all', 'ios', 'android'] as PlatformFilter[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatformFilter(p)}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-all ${
                      platformFilter === p
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {p === 'all'
                      ? t('notifications.allPlatforms')
                      : p === 'ios'
                        ? t('notifications.iosOnly')
                        : t('notifications.androidOnly')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              createCampaign.isPending ||
              !selectedType ||
              !startDate ||
              !endDate ||
              (isCustom && !customName.trim())
            }
          >
            {createCampaign.isPending ? t('common.loading') : t('campaigns.createCampaign')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Form helpers                                                  */
/* ------------------------------------------------------------------ */

function validateEditForm(
  mult: number,
  startDate: string,
  endDate: string,
  tiersLength: number,
): 'multiplierError' | 'dateError' | 'tierRequired' | null {
  if (mult < 1 || mult > 5) return 'multiplierError';
  if (!startDate || !endDate || endDate <= startDate) return 'dateError';
  if (tiersLength === 0) return 'tierRequired';
  return null;
}

function getCampaignTypeHint(
  type: string,
  winBackDays: string,
  welcomeDays: string,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string | undefined {
  if (type === 'BIRTHDAY_REWARD') return t('campaigns.birthdayHint');
  if (type === 'WIN_BACK') return t('campaigns.winBackHint', { days: winBackDays || '60' });
  if (type === 'WELCOME') return t('campaigns.welcomeHint', { days: welcomeDays || '30' });
  return undefined;
}

function buildCampaignTypePayload(
  type: string,
  winBackDays: string,
  welcomeDays: string,
  lastVisitDays: string,
): Record<string, unknown> {
  if (type === 'WIN_BACK') {
    const v = Number.parseInt(winBackDays, 10);
    return v > 0 ? { winBackDays: v } : {};
  }
  if (type === 'WELCOME') {
    const v = Number.parseInt(welcomeDays, 10);
    return v > 0 ? { welcomeDays: v } : {};
  }
  const v = Number.parseInt(lastVisitDays, 10);
  return v > 0 ? { lastVisitDays: v } : {};
}

function buildUpdatePayload(args: {
  startDate: string;
  endDate: string;
  mult: number;
  selectedTiers: string[];
  maxUses: string;
  minPurchase: string;
  maxPoints: string;
  message: string;
  type: string;
  winBackDays: string;
  welcomeDays: string;
  lastVisitDays: string;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    startDate: new Date(args.startDate).toISOString(),
    endDate: new Date(args.endDate).toISOString(),
    multiplier: args.mult,
    targetTiers: args.selectedTiers.length < ALL_TIERS.length ? args.selectedTiers : [],
    ...buildLimitsPayload(args.maxUses, args.minPurchase, args.maxPoints),
    ...buildCampaignTypePayload(args.type, args.winBackDays, args.welcomeDays, args.lastVisitDays),
  };
  if (args.message.trim()) data.message = args.message.trim();
  return data;
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/* ------------------------------------------------------------------ */
/*  Edit Campaign Form                                                 */
/* ------------------------------------------------------------------ */

export function EditCampaignForm({
  campaign,
  onClose,
}: {
  campaign: CampaignResponse;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const updateCampaign = useUpdateCampaign();

  const [startDate, setStartDate] = useState(formatDateInput(new Date(campaign.startDate)));
  const [endDate, setEndDate] = useState(formatDateInput(new Date(campaign.endDate)));
  const [multiplier, setMultiplier] = useState(String(campaign.multiplier));
  const [selectedTiers, setSelectedTiers] = useState<string[]>(
    campaign.targetTiers && campaign.targetTiers.length > 0 ? campaign.targetTiers : [...ALL_TIERS],
  );
  const [maxUses, setMaxUses] = useState(String(campaign.maxUsesPerCustomer ?? ''));
  const [minPurchase, setMinPurchase] = useState(String(campaign.minPurchaseAmount ?? ''));
  const [maxPoints, setMaxPoints] = useState(String(campaign.maxPointsPerTransaction ?? ''));
  const [message, setMessage] = useState(campaign.message ?? '');
  const [winBackDays, setWinBackDays] = useState(String(campaign.winBackDays ?? '60'));
  const [welcomeDays, setWelcomeDays] = useState(String(campaign.welcomeDays ?? '30'));
  const [lastVisitDays, setLastVisitDays] = useState(String(campaign.lastVisitDays ?? ''));

  const { data: tierBreakdown } = useTierBreakdown();

  const isWinBack = campaign.type === 'WIN_BACK';
  const isWelcome = campaign.type === 'WELCOME';
  const typeHint = getCampaignTypeHint(campaign.type, winBackDays, welcomeDays, t);

  const typeFieldProps = isWinBack
    ? {
        winBackDays,
        setWinBackDays,
        welcomeDays: undefined,
        setWelcomeDays: undefined,
        lastVisitDays: undefined,
        setLastVisitDays: undefined,
      }
    : isWelcome
      ? {
          winBackDays: undefined,
          setWinBackDays: undefined,
          welcomeDays,
          setWelcomeDays,
          lastVisitDays: undefined,
          setLastVisitDays: undefined,
        }
      : {
          winBackDays: undefined,
          setWinBackDays: undefined,
          welcomeDays: undefined,
          setWelcomeDays: undefined,
          lastVisitDays,
          setLastVisitDays,
        };

  const handleUpdate = async () => {
    const mult = Number.parseFloat(multiplier);
    const validationKey = validateEditForm(mult, startDate, endDate, selectedTiers.length);
    if (validationKey) {
      toast.error(t(`campaigns.${validationKey}`));
      return;
    }
    try {
      const data = buildUpdatePayload({
        startDate,
        endDate,
        mult,
        selectedTiers,
        maxUses,
        minPurchase,
        maxPoints,
        message,
        type: campaign.type,
        winBackDays,
        welcomeDays,
        lastVisitDays,
      });
      await updateCampaign.mutateAsync({
        campaignId: campaign.campaignId,
        data: data as Parameters<typeof updateCampaign.mutateAsync>[0]['data'],
      });
      toast.success(t('campaigns.updateSuccess'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <div className="mt-3 border-t pt-4 space-y-4">
      <CampaignFormFields
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        multiplier={multiplier}
        setMultiplier={setMultiplier}
        selectedTiers={selectedTiers}
        setSelectedTiers={setSelectedTiers}
        maxUses={maxUses}
        setMaxUses={setMaxUses}
        minPurchase={minPurchase}
        setMinPurchase={setMinPurchase}
        maxPoints={maxPoints}
        setMaxPoints={setMaxPoints}
        message={message}
        setMessage={setMessage}
        {...typeFieldProps}
        tierBreakdown={tierBreakdown as Record<string, number> | undefined}
        showTypeSpecificHint={typeHint}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" onClick={handleUpdate} disabled={updateCampaign.isPending}>
          {updateCampaign.isPending ? t('common.loading') : t('campaigns.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Campaign Card                                                      */
/* ------------------------------------------------------------------ */

export function CampaignCard({
  campaign,
  onDeactivate,
  deactivating,
}: {
  campaign: CampaignResponse;
  onDeactivate: (id: string) => void;
  deactivating: boolean;
}) {
  const { t, formatDate } = useTranslation();
  const [showEdit, setShowEdit] = useState(false);
  const status = getCampaignStatus(campaign);
  const meta = CAMPAIGN_TYPE_META.find((m) => m.type === campaign.type);
  const Icon = meta?.Icon ?? Megaphone;

  return (
    <div className="border rounded-xl bg-background transition-all hover:shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta?.color ?? 'text-muted-foreground bg-muted'}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{campaign.name}</p>
                <CampaignStatusBadge campaign={campaign} />
              </div>
              {campaign.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {campaign.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {campaign.isActive && (
              <button
                type="button"
                onClick={() => setShowEdit(!showEdit)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showEdit
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
                title={t('campaigns.edit')}
              >
                {showEdit ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
            )}
            {campaign.isActive && status !== 'expired' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivate(campaign.campaignId)}
                disabled={deactivating}
                className="text-xs"
              >
                {t('campaigns.deactivate')}
              </Button>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <CampaignTypeBadge type={campaign.type} />
          <MultiplierBadge multiplier={campaign.multiplier} />
          <TierBadges tiers={campaign.targetTiers} />
          {campaign.maxUsesPerCustomer && campaign.maxUsesPerCustomer > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              <Users className="w-3 h-3" />
              {campaign.maxUsesPerCustomer}× {t('campaigns.maxUsesShort')}
            </span>
          )}
          {campaign.minPurchaseAmount && campaign.minPurchaseAmount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t('campaigns.minSpend', { amount: campaign.minPurchaseAmount })}
            </span>
          )}
          {campaign.maxPointsPerTransaction && campaign.maxPointsPerTransaction > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              ≤{campaign.maxPointsPerTransaction} pts
            </span>
          )}
          {campaign.type === 'WIN_BACK' && campaign.winBackDays && campaign.winBackDays > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              {campaign.winBackDays}d inactive
            </span>
          )}
          {campaign.type === 'WELCOME' && campaign.welcomeDays && campaign.welcomeDays > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              within {campaign.welcomeDays}d
            </span>
          )}
          {campaign.lastVisitDays && campaign.lastVisitDays > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              inactive {campaign.lastVisitDays}d+
            </span>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="px-4 pb-4">
          <EditCampaignForm campaign={campaign} onClose={() => setShowEdit(false)} />
        </div>
      )}
    </div>
  );
}
