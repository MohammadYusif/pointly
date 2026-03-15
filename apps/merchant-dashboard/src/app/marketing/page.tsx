'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import {
  useCampaigns,
  useCreateCampaign,
  useCreatePerk,
  useDeactivateCampaign,
  useDeletePerk,
  usePerkInsights,
  usePerks,
} from '@/hooks/api';
import type { CampaignResponse, MerchantPerk } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { useState } from 'react';
import { toast } from 'sonner';

function CampaignStatusBadge({ campaign }: { campaign: CampaignResponse }) {
  const { t } = useTranslation();
  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);

  if (!campaign.isActive) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
        {t('common.inactive')}
      </span>
    );
  }
  if (now < start) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
        {t('campaigns.scheduled')}
      </span>
    );
  }
  if (now > end) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
        {t('campaigns.expired')}
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
      {t('campaigns.active')}
    </span>
  );
}

export default function MarketingPage() {
  const { t, formatDate } = useTranslation();
  const { textStart } = useRTL();

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const deactivateCampaign = useDeactivateCampaign();

  const { data: perksData, isLoading: perksLoading } = usePerks();
  const perks = (perksData as MerchantPerk[] | undefined) || [];
  const createPerk = useCreatePerk();
  const deletePerk = useDeletePerk();

  const { data: insights } = usePerkInsights();

  // Campaign form state
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');
  const [campaignMultiplier, setCampaignMultiplier] = useState('2');

  // Perk form state
  const [showAddPerk, setShowAddPerk] = useState(false);
  const [perkType, setPerkType] = useState('EARLY_ACCESS');
  const [perkTitle, setPerkTitle] = useState('');
  const [perkDescription, setPerkDescription] = useState('');
  const [perkTier, setPerkTier] = useState('GOLD');

  const resetCampaignForm = () => {
    setCampaignName('');
    setCampaignDesc('');
    setCampaignStart('');
    setCampaignEnd('');
    setCampaignMultiplier('2');
    setShowCreateCampaign(false);
  };

  const handleCreateCampaign = async () => {
    const multiplier = Number.parseFloat(campaignMultiplier);
    if (multiplier < 1 || multiplier > 5) {
      toast.error(t('campaigns.multiplierError'));
      return;
    }
    if (campaignEnd <= campaignStart) {
      toast.error(t('campaigns.dateError'));
      return;
    }
    try {
      await createCampaign.mutateAsync({
        name: campaignName,
        description: campaignDesc,
        startDate: new Date(campaignStart).toISOString(),
        endDate: new Date(campaignEnd).toISOString(),
        multiplier,
      });
      toast.success(t('campaigns.createSuccess'));
      resetCampaignForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDeactivate = async (campaignId: string) => {
    try {
      await deactivateCampaign.mutateAsync(campaignId);
      toast.success(t('campaigns.deactivateSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleAddPerk = async () => {
    if (!perkTitle || !perkDescription) return;
    try {
      await createPerk.mutateAsync({
        type: perkType,
        title: perkTitle,
        description: perkDescription,
        requiredTier: perkTier,
      });
      toast.success(t('success.created'));
      setShowAddPerk(false);
      setPerkTitle('');
      setPerkDescription('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDeletePerk = async (perkId: string) => {
    try {
      await deletePerk.mutateAsync(perkId);
      toast.success(t('success.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

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

      <div className="space-y-6">
        {/* Campaigns Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('campaigns.title')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateCampaign(!showCreateCampaign)}
            >
              {t('campaigns.createCampaign')}
            </Button>
          </CardHeader>
          <CardContent>
            {showCreateCampaign && (
              <div className="mb-4 p-4 border rounded-md space-y-3">
                <Input
                  placeholder={t('campaigns.namePlaceholder')}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
                <Input
                  placeholder={t('campaigns.descriptionPlaceholder')}
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="campaign-start"
                      className="text-sm text-muted-foreground block mb-1"
                    >
                      {t('campaigns.startDate')}
                    </label>
                    <Input
                      id="campaign-start"
                      type="date"
                      value={campaignStart}
                      onChange={(e) => setCampaignStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="campaign-end"
                      className="text-sm text-muted-foreground block mb-1"
                    >
                      {t('campaigns.endDate')}
                    </label>
                    <Input
                      id="campaign-end"
                      type="date"
                      value={campaignEnd}
                      onChange={(e) => setCampaignEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="campaign-multiplier"
                    className="text-sm text-muted-foreground block mb-1"
                  >
                    {t('campaigns.multiplier')}
                  </label>
                  <Input
                    id="campaign-multiplier"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={campaignMultiplier}
                    onChange={(e) => setCampaignMultiplier(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetCampaignForm}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={
                      createCampaign.isPending || !campaignName || !campaignStart || !campaignEnd
                    }
                  >
                    {createCampaign.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {campaignsLoading ? (
              <p className="text-center text-muted-foreground py-4">{t('common.loading')}</p>
            ) : !campaigns || campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('campaigns.noCampaigns')}
              </p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.campaignId}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{campaign.name}</p>
                        <CampaignStatusBadge campaign={campaign} />
                        <span className="text-xs font-medium text-primary">
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

        {/* Perks Manager Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('perks.managedPerks')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddPerk(!showAddPerk)}>
              {t('perks.addPerk')}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Perk Insights */}
            {insights && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 border rounded-md text-center">
                  <p className="text-2xl font-bold text-primary">{insights.birthdayReward.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('perkInsights.birthdayThisMonth')}
                  </p>
                </div>
                <div className="p-3 border rounded-md text-center">
                  <p className="text-2xl font-bold text-amber-600">{insights.winBack.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('perkInsights.inactiveCustomers')}
                  </p>
                </div>
                <div className="p-3 border rounded-md text-center">
                  <p className="text-2xl font-bold text-green-600">{insights.welcomeOffer.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('perkInsights.newCustomers')}
                  </p>
                </div>
                <div className="p-3 border rounded-md text-center">
                  <p className="text-2xl font-bold text-foreground">{insights.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('perkInsights.totalCustomers')}
                  </p>
                </div>
              </div>
            )}

            {showAddPerk && (
              <div className="mb-4 p-4 border rounded-md space-y-3">
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={perkType}
                  onChange={(e) => setPerkType(e.target.value)}
                >
                  <option value="EARLY_ACCESS">{t('perks.earlyAccess')}</option>
                  <option value="EXCLUSIVE_PRODUCT">{t('perks.exclusiveProduct')}</option>
                  <option value="EVENT">{t('perks.event')}</option>
                  <option value="BIRTHDAY_REWARD">{t('perks.birthdayReward')}</option>
                  <option value="SPEND_BONUS">{t('perks.spendBonus')}</option>
                  <option value="REFERRAL_BONUS">{t('perks.referralBonus')}</option>
                  <option value="HAPPY_HOUR">{t('perks.happyHour')}</option>
                  <option value="WIN_BACK">{t('perks.winBack')}</option>
                  <option value="WELCOME_OFFER">{t('perks.welcomeOffer')}</option>
                </select>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={perkTier}
                  onChange={(e) => setPerkTier(e.target.value)}
                >
                  <option value="BRONZE">{t('tier.bronze')}</option>
                  <option value="GOLD">{t('tier.gold')}</option>
                  <option value="PLATINUM">{t('tier.platinum')}</option>
                  <option value="DIAMOND">{t('tier.diamond')}</option>
                </select>
                <Input
                  placeholder={t('perks.title_field')}
                  value={perkTitle}
                  onChange={(e) => setPerkTitle(e.target.value)}
                />
                <Input
                  placeholder={t('perks.description')}
                  value={perkDescription}
                  onChange={(e) => setPerkDescription(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowAddPerk(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddPerk}
                    disabled={createPerk.isPending || !perkTitle || !perkDescription}
                  >
                    {createPerk.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {perksLoading ? (
              <p className="text-center text-muted-foreground py-4">{t('common.loading')}</p>
            ) : (
              <div className="space-y-2">
                {perks
                  .filter((p) => p.isActive)
                  .map((perk) => (
                    <div
                      key={perk.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">{perk.title}</p>
                        <p className="text-sm text-muted-foreground">{perk.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {perk.type} · {perk.requiredTier}+
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePerk(perk.id)}
                        disabled={deletePerk.isPending}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  ))}
                {perks.filter((p) => p.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('common.noData')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
