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
import { useMemo, useState } from 'react';
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

/* ------------------------------------------------------------------ */
/*  Create Form                                                        */
/* ------------------------------------------------------------------ */

function CreateCampaignForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createCampaign = useCreateCampaign();

  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [message, setMessage] = useState('');

  // Custom type fields
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customMultiplier, setCustomMultiplier] = useState('2');

  const isCustom = selectedType === 'CUSTOM';

  const validateCustomFields = (): string | null => {
    const multiplier = Number.parseFloat(customMultiplier);
    if (multiplier < 1 || multiplier > 5) return t('campaigns.multiplierError');
    if (!customStart || !customEnd || customEnd <= customStart) return t('campaigns.dateError');
    return null;
  };

  const buildPayload = (type: CampaignType): Record<string, unknown> => {
    const payload: Record<string, unknown> = { type };
    if (message.trim()) payload.message = message.trim();
    if (!isCustom) return payload;
    if (customName.trim()) payload.name = customName.trim();
    if (customDesc.trim()) payload.description = customDesc.trim();
    payload.startDate = new Date(customStart).toISOString();
    payload.endDate = new Date(customEnd).toISOString();
    payload.multiplier = Number.parseFloat(customMultiplier);
    return payload;
  };

  const handleCreate = async () => {
    if (!selectedType) return;

    if (isCustom) {
      const error = validateCustomFields();
      if (error) {
        toast.error(error);
        return;
      }
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

      {/* Optional message — always visible once type selected */}
      {selectedType && (
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
      )}

      {/* Custom type fields */}
      {isCustom && (
        <div className="space-y-3 p-4 border rounded-md bg-background">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-start" className="text-sm text-muted-foreground block mb-1">
                {t('campaigns.startDate')}
              </label>
              <Input
                id="custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="custom-end" className="text-sm text-muted-foreground block mb-1">
                {t('campaigns.endDate')}
              </label>
              <Input
                id="custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="custom-multiplier" className="text-sm text-muted-foreground block mb-1">
              {t('campaigns.multiplier')}
            </label>
            <Input
              id="custom-multiplier"
              type="number"
              min="1"
              max="5"
              step="0.5"
              value={customMultiplier}
              onChange={(e) => setCustomMultiplier(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={
            createCampaign.isPending || !selectedType || (isCustom && (!customStart || !customEnd))
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
