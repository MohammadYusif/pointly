'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useCampaigns, useCreateCampaign, useDeactivateCampaign } from '@/hooks/api';
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
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CAMPAIGN_TYPES: { type: CampaignType; icon: string; labelKey: string }[] = [
  { type: 'DOUBLE_POINTS', icon: '2️⃣', labelKey: 'campaigns.types.doublePoints' },
  { type: 'TRIPLE_POINTS', icon: '3️⃣', labelKey: 'campaigns.types.triplePoints' },
  { type: 'BIRTHDAY_REWARD', icon: '🎂', labelKey: 'campaigns.types.birthdayReward' },
  { type: 'WIN_BACK', icon: '💌', labelKey: 'campaigns.types.winBack' },
  { type: 'WELCOME', icon: '👋', labelKey: 'campaigns.types.welcome' },
  { type: 'HAPPY_HOUR', icon: '⚡', labelKey: 'campaigns.types.happyHour' },
  { type: 'CUSTOM', icon: '🛠️', labelKey: 'campaigns.types.custom' },
];

/** Frontend mirror of CAMPAIGN_DEFAULTS from the API domain */
const CAMPAIGN_DEFAULTS: Record<string, { durationDays: number; multiplier: number }> = {
  DOUBLE_POINTS: { durationDays: 7, multiplier: 2 },
  TRIPLE_POINTS: { durationDays: 3, multiplier: 3 },
  BIRTHDAY_REWARD: { durationDays: 30, multiplier: 2 },
  WIN_BACK: { durationDays: 14, multiplier: 3 },
  WELCOME: { durationDays: 7, multiplier: 2 },
  HAPPY_HOUR: { durationDays: 1, multiplier: 2 },
};

const ALL_TIERS = ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] as const;

type FilterTab = 'all' | 'active' | 'scheduled' | 'expired';

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
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CampaignStatusBadge({ campaign }: { campaign: CampaignResponse }) {
  const { t } = useTranslation();
  const status = getCampaignStatus(campaign);

  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    expired: 'bg-amber-100 text-amber-800',
    inactive: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<string, string> = {
    active: t('campaigns.active'),
    scheduled: t('campaigns.scheduled'),
    expired: t('campaigns.expired'),
    inactive: t('common.inactive'),
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function CampaignTypeBadge({ type }: { type: CampaignType | undefined }) {
  const { t } = useTranslation();
  const entry = CAMPAIGN_TYPES.find((ct) => ct.type === type);
  if (!entry) return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
      {entry.icon} {t(entry.labelKey)}
    </span>
  );
}

function TierBadges({ tiers }: { tiers: string[] | undefined }) {
  const { t } = useTranslation();
  if (!tiers || tiers.length === 0 || tiers.length === ALL_TIERS.length) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
        {t('campaigns.allTiers')}
      </span>
    );
  }
  return (
    <>
      {tiers.map((tier) => (
        <span
          key={tier}
          className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800"
        >
          {t(`tier.${tier.toLowerCase()}`)}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Form                                                        */
/* ------------------------------------------------------------------ */

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

  const isCustom = selectedType === 'CUSTOM';

  // Pre-populate fields when type changes
  useEffect(() => {
    if (!selectedType || selectedType === 'CUSTOM') return;
    const defaults = CAMPAIGN_DEFAULTS[selectedType];
    if (!defaults) return;
    const dates = getDefaultDates(defaults.durationDays);
    setStartDate(dates.start);
    setEndDate(dates.end);
    setMultiplier(String(defaults.multiplier));
  }, [selectedType]);

  const toggleTier = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

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
    <div className="p-5 border rounded-lg space-y-5 bg-muted/30">
      {/* Type selector grid */}
      <div>
        <p className="text-sm font-medium mb-3">{t('campaigns.selectType')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CAMPAIGN_TYPES.map((ct) => (
            <button
              key={ct.type}
              type="button"
              onClick={() => setSelectedType(ct.type)}
              className={`p-3 border rounded-lg text-center transition-all text-sm hover:border-primary/50 ${
                selectedType === ct.type
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border'
              }`}
            >
              <span className="text-xl block mb-1">{ct.icon}</span>
              <span className="font-medium">{t(ct.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fields — visible once type is selected */}
      {selectedType && (
        <>
          {/* Custom-only: name + description */}
          {isCustom && (
            <div className="space-y-3">
              <Input
                placeholder={t('campaigns.namePlaceholder')}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <Input
                placeholder={t('campaigns.descriptionPlaceholder')}
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
            </div>
          )}

          {/* Dates + multiplier — all types */}
          <div className="space-y-3 p-4 border rounded-md bg-background">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {t('campaigns.overrideDefaults')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-date" className="text-sm text-muted-foreground block mb-1">
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
                <label htmlFor="end-date" className="text-sm text-muted-foreground block mb-1">
                  {t('campaigns.endDate')}
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="multiplier" className="text-sm text-muted-foreground block mb-1">
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
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('campaigns.targetTiers')}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => toggleTier(tier)}
                  className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                    selectedTiers.includes(tier)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {t(`tier.${tier.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Limits */}
          <div className="space-y-3 p-4 border rounded-md bg-background">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {t('campaigns.campaignLimits')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="max-uses" className="text-sm text-muted-foreground block mb-1">
                  {t('campaigns.maxUses')}
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
                <label htmlFor="min-purchase" className="text-sm text-muted-foreground block mb-1">
                  {t('campaigns.minPurchase')}
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
                <label htmlFor="max-points" className="text-sm text-muted-foreground block mb-1">
                  {t('campaigns.maxPoints')}
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
          </div>

          {/* Optional message */}
          <div>
            <label htmlFor="campaign-message" className="text-sm text-muted-foreground block mb-1">
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
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
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
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MarketingPage() {
  const { t, formatDate } = useTranslation();
  const { textStart } = useRTL();

  const { data: campaigns, isLoading } = useCampaigns();
  const deactivateCampaign = useDeactivateCampaign();

  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  // Stats
  const stats = useMemo(() => {
    if (!campaigns) return { active: 0, total: 0 };
    const now = new Date();
    const active = campaigns.filter((c) => {
      if (!c.isActive) return false;
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return now >= start && now <= end;
    }).length;
    return { active, total: campaigns.length };
  }, [campaigns]);

  // Filtered campaigns
  const filtered = useMemo(() => {
    if (!campaigns) return [];
    if (filter === 'all') return campaigns;
    return campaigns.filter((c) => getCampaignStatus(c) === filter);
  }, [campaigns, filter]);

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
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold text-foreground ${textStart}`}>
          {t('marketing.title')}
        </h1>
        <p className={`text-sm text-muted-foreground mt-1 ${textStart}`}>
          {t('marketing.subtitle')}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.active}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('campaigns.activeCampaigns')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('campaigns.totalCampaigns')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('campaigns.title')}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? t('common.cancel') : t('campaigns.createCampaign')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Create Form */}
          {showCreate && (
            <div className="mb-5">
              <CreateCampaignForm onClose={() => setShowCreate(false)} />
            </div>
          )}

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

          {/* Campaign List */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('campaigns.noCampaigns')}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((campaign) => (
                <div
                  key={campaign.campaignId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{campaign.name}</p>
                      <CampaignTypeBadge type={campaign.type} />
                      <CampaignStatusBadge campaign={campaign} />
                      <span className="text-xs font-semibold text-primary">
                        {campaign.multiplier}
                        {t('campaigns.multiplierSuffix')}
                      </span>
                      <TierBadges tiers={campaign.targetTiers} />
                      {campaign.maxUsesPerCustomer && campaign.maxUsesPerCustomer > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {campaign.maxUsesPerCustomer}x {t('campaigns.maxUses')}
                        </span>
                      )}
                      {campaign.minPurchaseAmount && campaign.minPurchaseAmount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          {t('campaigns.minSpend', { amount: campaign.minPurchaseAmount })}
                        </span>
                      )}
                      {campaign.maxPointsPerTransaction && campaign.maxPointsPerTransaction > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          {t('campaigns.maxPoints')}: {campaign.maxPointsPerTransaction}
                        </span>
                      )}
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                    </p>
                  </div>
                  {campaign.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(campaign.campaignId)}
                      disabled={deactivateCampaign.isPending}
                    >
                      {t('campaigns.deactivate')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
