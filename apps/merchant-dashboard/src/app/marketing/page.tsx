'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import {
  useCampaigns,
  useCreateCampaign,
  useDeactivateCampaign,
  usePushStats,
  useTierBreakdown,
  useUpdateCampaign,
} from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignResponse, CampaignType } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  useRTL,
} from '@pointly/ui';
import {
  Cake,
  ChevronUp,
  Clock,
  Edit2,
  Flame,
  Gift,
  Heart,
  Megaphone,
  Plus,
  Search,
  Sliders,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type CampaignIconComponent = React.ComponentType<{ className?: string }>;

const CAMPAIGN_TYPE_META: {
  type: CampaignType;
  Icon: CampaignIconComponent;
  labelKey: string;
  color: string;
  descKey: string;
}[] = [
  {
    type: 'DOUBLE_POINTS',
    Icon: Zap,
    labelKey: 'campaigns.types.doublePoints',
    color: 'text-primary bg-primary/10',
    descKey: 'campaigns.typeDesc.doublePoints',
  },
  {
    type: 'TRIPLE_POINTS',
    Icon: Flame,
    labelKey: 'campaigns.types.triplePoints',
    color: 'text-orange-600 bg-orange-50',
    descKey: 'campaigns.typeDesc.triplePoints',
  },
  {
    type: 'BIRTHDAY_REWARD',
    Icon: Cake,
    labelKey: 'campaigns.types.birthdayReward',
    color: 'text-pink-600 bg-pink-50',
    descKey: 'campaigns.typeDesc.birthdayReward',
  },
  {
    type: 'WIN_BACK',
    Icon: Heart,
    labelKey: 'campaigns.types.winBack',
    color: 'text-rose-600 bg-rose-50',
    descKey: 'campaigns.typeDesc.winBack',
  },
  {
    type: 'WELCOME',
    Icon: Sparkles,
    labelKey: 'campaigns.types.welcome',
    color: 'text-secondary bg-secondary/10',
    descKey: 'campaigns.typeDesc.welcome',
  },
  {
    type: 'HAPPY_HOUR',
    Icon: Clock,
    labelKey: 'campaigns.types.happyHour',
    color: 'text-amber-600 bg-amber-50',
    descKey: 'campaigns.typeDesc.happyHour',
  },
  {
    type: 'CUSTOM',
    Icon: Sliders,
    labelKey: 'campaigns.types.custom',
    color: 'text-muted-foreground bg-muted',
    descKey: 'campaigns.typeDesc.custom',
  },
];

/** Frontend mirror of CAMPAIGN_DEFAULTS from the API domain */
const CAMPAIGN_DEFAULTS: Record<string, { durationDays: number; multiplier: number }> = {
  DOUBLE_POINTS: { durationDays: 7, multiplier: 2 },
  TRIPLE_POINTS: { durationDays: 3, multiplier: 3 },
  BIRTHDAY_REWARD: { durationDays: 365, multiplier: 2 },
  WIN_BACK: { durationDays: 14, multiplier: 3 },
  WELCOME: { durationDays: 7, multiplier: 2 },
  HAPPY_HOUR: { durationDays: 1, multiplier: 2 },
};

const ALL_TIERS = ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] as const;

type FilterTab = 'all' | 'active' | 'scheduled' | 'expired';
type SortOption = 'newest' | 'multiplier' | 'name';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCampaignStatus(
  campaign: CampaignResponse,
): 'active' | 'scheduled' | 'expired' | 'inactive' {
  if (!campaign.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function buildLimitsPayload(
  maxUses: string,
  minPurchase: string,
  maxPoints: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  const parsedMaxUses = Number.parseInt(maxUses, 10);
  const parsedMinPurchase = Number.parseFloat(minPurchase);
  const parsedMaxPoints = Number.parseInt(maxPoints, 10);
  if (parsedMaxUses > 0) result.maxUsesPerCustomer = parsedMaxUses;
  if (parsedMinPurchase > 0) result.minPurchaseAmount = parsedMinPurchase;
  if (parsedMaxPoints > 0) result.maxPointsPerTransaction = parsedMaxPoints;
  return result;
}

function getDefaultDates(durationDays: number): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return { start: formatDateInput(now), end: formatDateInput(end) };
}

/* ------------------------------------------------------------------ */
/*  Badge components                                                   */
/* ------------------------------------------------------------------ */

function CampaignStatusBadge({ campaign }: { campaign: CampaignResponse }) {
  const { t } = useTranslation();
  const status = getCampaignStatus(campaign);

  const styles: Record<string, string> = {
    active: 'bg-primary/10 text-primary border border-primary/20',
    scheduled: 'bg-secondary/10 text-secondary border border-secondary/20',
    expired: 'bg-muted text-muted-foreground border border-border',
    inactive: 'bg-muted text-muted-foreground border border-border',
  };
  const labels: Record<string, string> = {
    active: t('campaigns.active'),
    scheduled: t('campaigns.scheduled'),
    expired: t('campaigns.expired'),
    inactive: t('common.inactive'),
  };
  const dots: Record<string, string> = {
    active: 'bg-primary',
    scheduled: 'bg-secondary',
    expired: 'bg-muted-foreground',
    inactive: 'bg-muted-foreground',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  );
}

function CampaignTypeBadge({ type }: { type: CampaignType | undefined }) {
  const { t } = useTranslation();
  const meta = CAMPAIGN_TYPE_META.find((m) => m.type === type);
  if (!meta) return null;
  const { Icon, color } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${color}`}
    >
      <Icon className="w-3 h-3" />
      {t(meta.labelKey)}
    </span>
  );
}

const TIER_STYLES: Record<string, string> = {
  BRONZE: 'bg-amber-50 text-amber-700 border border-amber-200',
  GOLD: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  PLATINUM: 'bg-blue-50 text-blue-700 border border-blue-200',
  DIAMOND: 'bg-primary/10 text-primary border border-primary/20',
};

function TierBadges({ tiers }: { tiers: string[] | undefined }) {
  const { t } = useTranslation();
  if (!tiers || tiers.length === 0 || tiers.length === ALL_TIERS.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
        <Users className="w-3 h-3" />
        {t('campaigns.allTiers')}
      </span>
    );
  }
  return (
    <>
      {tiers.map((tier) => (
        <span
          key={tier}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[tier] ?? 'bg-muted text-muted-foreground'}`}
        >
          {t(`tier.${tier.toLowerCase()}`)}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Multiplier display                                                 */
/* ------------------------------------------------------------------ */

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  const isHigh = multiplier >= 3;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-bold px-2.5 py-0.5 rounded-full ${
        isHigh ? 'bg-orange-100 text-orange-700' : 'bg-primary/10 text-primary'
      }`}
    >
      <Zap className="w-3.5 h-3.5" />
      {multiplier}x
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared form fields (used by both Create and Edit forms)           */
/* ------------------------------------------------------------------ */

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

function CampaignFormFields({
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
    const parts: string[] = [];
    const mult = Number.parseFloat(multiplier);
    if (!Number.isNaN(mult) && mult > 0) parts.push(`Earn ${mult}x points on your purchases`);
    const minP = Number.parseFloat(minPurchase);
    if (!Number.isNaN(minP) && minP > 0) parts.push(`Minimum purchase: ${minP} SAR`);
    const maxU = Number.parseInt(maxUses, 10);
    if (!Number.isNaN(maxU) && maxU > 0)
      parts.push(`Limited to ${maxU} ${maxU === 1 ? 'use' : 'uses'} per customer`);
    const maxP = Number.parseInt(maxPoints, 10);
    if (!Number.isNaN(maxP) && maxP > 0) parts.push(`Maximum ${maxP} bonus points per transaction`);
    if (endDate) {
      const endD = new Date(endDate);
      if (!Number.isNaN(endD.getTime())) {
        parts.push(
          `Valid until ${endD.toLocaleDateString('en-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        );
      }
    }
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
      {/* Custom-only: name + description */}
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

      {/* Type-specific hint (e.g. birthday, win-back, welcome) */}
      {showTypeSpecificHint && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary">
          <Gift className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{showTypeSpecificHint}</p>
        </div>
      )}

      {/* Win-back: configurable inactivity threshold */}
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

      {/* Welcome: configurable enrollment window */}
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

      {/* Generic last-visit filter (all types except WIN_BACK and WELCOME which have dedicated fields) */}
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

      {/* Dates + multiplier */}
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

      {/* Tier targeting */}
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
                ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
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

      {/* Campaign Limits */}
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

      {/* Auto-generated terms preview */}
      {termsPreview && (
        <div className="p-3 border rounded-xl bg-secondary/5 border-secondary/20">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-1">
            {t('campaigns.termsPreview')}
          </p>
          <p className="text-sm text-muted-foreground">{termsPreview}</p>
        </div>
      )}

      {/* Optional message */}
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

/* ------------------------------------------------------------------ */
/*  Create Form                                                        */
/* ------------------------------------------------------------------ */

type PlatformFilter = 'all' | 'ios' | 'android';

function CreateCampaignForm({ onClose }: { onClose: () => void }) {
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

  const validateFields = (): string | null => {
    const mult = Number.parseFloat(multiplier);
    if (mult < 1 || mult > 5) return t('campaigns.multiplierError');
    if (!startDate || !endDate || endDate <= startDate) return t('campaigns.dateError');
    if (selectedTiers.length === 0) return t('campaigns.tierRequired');
    return null;
  };

  const buildPayload = (type: CampaignType): Record<string, unknown> => {
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
    if (type === 'WIN_BACK') {
      const parsed = Number.parseInt(winBackDays, 10);
      if (parsed > 0) payload.winBackDays = parsed;
    }
    if (type === 'WELCOME') {
      const parsed = Number.parseInt(welcomeDays, 10);
      if (parsed > 0) payload.welcomeDays = parsed;
    }
    if (type !== 'WIN_BACK' && type !== 'WELCOME') {
      const parsed = Number.parseInt(lastVisitDays, 10);
      if (parsed > 0) payload.lastVisitDays = parsed;
    }
    return { ...payload, ...buildLimitsPayload(maxUses, minPurchase, maxPoints) };
  };

  const handleCreate = async () => {
    if (!selectedType) return;
    const error = validateFields();
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const payload = buildPayload(selectedType);
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
        {/* Type selector grid */}
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
                  onClick={() => setSelectedType(meta.type)}
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
            showTypeSpecificHint={
              selectedType === 'BIRTHDAY_REWARD'
                ? t('campaigns.birthdayHint')
                : selectedType === 'WIN_BACK'
                  ? t('campaigns.winBackHint', { days: winBackDays || '60' })
                  : selectedType === 'WELCOME'
                    ? t('campaigns.welcomeHint', { days: welcomeDays || '30' })
                    : undefined
            }
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
/*  Edit Form (inline expand)                                         */
/* ------------------------------------------------------------------ */

function EditCampaignForm({
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

  const handleUpdate = async () => {
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
      const data: Record<string, unknown> = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        multiplier: mult,
        targetTiers: selectedTiers.length < ALL_TIERS.length ? selectedTiers : [],
        ...buildLimitsPayload(maxUses, minPurchase, maxPoints),
      };
      if (message.trim()) data.message = message.trim();
      if (campaign.type === 'WIN_BACK') {
        const parsed = Number.parseInt(winBackDays, 10);
        if (parsed > 0) data.winBackDays = parsed;
      }
      if (campaign.type === 'WELCOME') {
        const parsed = Number.parseInt(welcomeDays, 10);
        if (parsed > 0) data.welcomeDays = parsed;
      }
      if (campaign.type !== 'WIN_BACK' && campaign.type !== 'WELCOME') {
        const parsed = Number.parseInt(lastVisitDays, 10);
        if (parsed > 0) data.lastVisitDays = parsed;
      }

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
        winBackDays={campaign.type === 'WIN_BACK' ? winBackDays : undefined}
        setWinBackDays={campaign.type === 'WIN_BACK' ? setWinBackDays : undefined}
        welcomeDays={campaign.type === 'WELCOME' ? welcomeDays : undefined}
        setWelcomeDays={campaign.type === 'WELCOME' ? setWelcomeDays : undefined}
        lastVisitDays={
          campaign.type !== 'WIN_BACK' && campaign.type !== 'WELCOME' ? lastVisitDays : undefined
        }
        setLastVisitDays={
          campaign.type !== 'WIN_BACK' && campaign.type !== 'WELCOME' ? setLastVisitDays : undefined
        }
        tierBreakdown={tierBreakdown as Record<string, number> | undefined}
        showTypeSpecificHint={
          campaign.type === 'BIRTHDAY_REWARD'
            ? t('campaigns.birthdayHint')
            : campaign.type === 'WIN_BACK'
              ? t('campaigns.winBackHint', { days: winBackDays || '60' })
              : campaign.type === 'WELCOME'
                ? t('campaigns.welcomeHint', { days: welcomeDays || '30' })
                : undefined
        }
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

function CampaignCard({
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
          {/* Left: icon + info */}
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

          {/* Right: actions */}
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

      {/* Inline edit */}
      {showEdit && (
        <div className="px-4 pb-4">
          <EditCampaignForm campaign={campaign} onClose={() => setShowEdit(false)} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MarketingPage() {
  const { t, formatDate: _formatDate } = useTranslation();
  const { textStart } = useRTL();
  const { merchant: authMerchant } = useAuth();

  const { data: campaigns, isLoading } = useCampaigns();
  const deactivateCampaign = useDeactivateCampaign();
  const { data: pushStats } = usePushStats(authMerchant?.merchantId);

  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  // Stats
  const stats = useMemo(() => {
    if (!campaigns) return { active: 0, total: 0, scheduled: 0 };
    const now = new Date();
    const active = campaigns.filter((c) => {
      if (!c.isActive) return false;
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return now >= start && now <= end;
    }).length;
    const scheduled = campaigns.filter((c) => {
      if (!c.isActive) return false;
      return new Date() < new Date(c.startDate);
    }).length;
    return { active, total: campaigns.length, scheduled };
  }, [campaigns]);

  // Filtered + searched + sorted campaigns
  const filtered = useMemo(() => {
    if (!campaigns) return [];
    let list = campaigns;

    // Status tab
    if (filter !== 'all') {
      list = list.filter((c) => getCampaignStatus(c) === filter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter((c) => c.type === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q),
      );
    }

    // Sort
    if (sort === 'newest') {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    } else if (sort === 'multiplier') {
      list = [...list].sort((a, b) => b.multiplier - a.multiplier);
    } else if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [campaigns, filter, typeFilter, search, sort]);

  const handleDeactivate = async (campaignId: string) => {
    try {
      await deactivateCampaign.mutateAsync(campaignId);
      toast.success(t('campaigns.deactivateSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('campaigns.filterAll') },
    { key: 'active', label: t('campaigns.active') },
    { key: 'scheduled', label: t('campaigns.scheduled') },
    { key: 'expired', label: t('campaigns.expired') },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
            {t('marketing.title')}
          </h1>
          <p className={`text-sm text-muted-foreground mt-1 ${textStart}`}>
            {t('marketing.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          {showCreate ? t('common.cancel') : t('campaigns.createCampaign')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.active}</p>
                <p className="text-xs text-muted-foreground">{t('campaigns.activeCampaigns')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{stats.scheduled}</p>
                <p className="text-xs text-muted-foreground">{t('campaigns.scheduledCampaigns')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('campaigns.totalCampaigns')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Push Subscriber Stats */}
      {pushStats && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 px-4 py-2.5 border rounded-xl bg-background text-sm">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t('notifications.ios')} {t('notifications.subscribers')}:
            </span>
            <span className="font-semibold">{pushStats.ios}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 border rounded-xl bg-background text-sm">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t('notifications.android')} {t('notifications.subscribers')}:
            </span>
            <span className="font-semibold">{pushStats.android}</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6">
          <CreateCampaignForm onClose={() => setShowCreate(false)} />
        </div>
      )}

      {/* Campaigns Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('campaigns.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Tabs */}
          <div className="flex gap-1 mb-4 p-1 bg-muted/50 rounded-lg">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Type Filter + Sort */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('campaigns.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CampaignType | 'all')}
              className="h-9 px-3 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">{t('campaigns.allTypes')}</option>
              {CAMPAIGN_TYPE_META.map((m) => (
                <option key={m.type} value={m.type}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 px-3 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="newest">{t('campaigns.sortNewest')}</option>
              <option value="multiplier">{t('campaigns.sortMultiplier')}</option>
              <option value="name">{t('campaigns.sortName')}</option>
            </select>
          </div>

          {/* Campaign List */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('campaigns.noCampaigns')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((campaign) => (
                <CampaignCard
                  key={campaign.campaignId}
                  campaign={campaign}
                  onDeactivate={handleDeactivate}
                  deactivating={deactivateCampaign.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
