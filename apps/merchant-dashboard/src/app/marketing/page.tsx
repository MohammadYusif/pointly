'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import {
  useCampaigns,
  useCreateCampaign,
  useCreateWebhook,
  useDeactivateCampaign,
  useDeleteWebhook,
  useWebhooks,
} from '@/hooks/api';
import type { CampaignResponse } from '@/types/api';
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

  const { data: webhooks, isLoading: webhooksLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  // Campaign form state
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');
  const [campaignMultiplier, setCampaignMultiplier] = useState('2');

  // Webhook form state
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

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

  const resetWebhookForm = () => {
    setWebhookUrl('');
    setWebhookSecret('');
    setShowCreateWebhook(false);
  };

  const handleCreateWebhook = async () => {
    try {
      await createWebhook.mutateAsync({
        url: webhookUrl,
        secretKey: webhookSecret,
        events: ['REDEMPTION'],
      });
      toast.success(t('webhooks.createSuccess'));
      resetWebhookForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhook.mutateAsync(webhookId);
      toast.success(t('webhooks.deleteSuccess'));
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

        {/* Webhooks Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('webhooks.title')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateWebhook(!showCreateWebhook)}
            >
              {t('webhooks.createWebhook')}
            </Button>
          </CardHeader>
          <CardContent>
            {showCreateWebhook && (
              <div className="mb-4 p-4 border rounded-md space-y-3">
                <div>
                  <label htmlFor="webhook-url" className="text-sm text-muted-foreground block mb-1">
                    {t('webhooks.url')}
                  </label>
                  <Input
                    id="webhook-url"
                    placeholder={t('webhooks.urlPlaceholder')}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label
                    htmlFor="webhook-secret"
                    className="text-sm text-muted-foreground block mb-1"
                  >
                    {t('webhooks.secretKey')}
                  </label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('webhooks.secretKeyHint')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('webhooks.events')}</p>
                  <label className="flex items-center gap-2 cursor-not-allowed">
                    <input type="checkbox" checked disabled className="rounded" />
                    <span className="text-sm">{t('webhooks.redemption')}</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetWebhookForm}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateWebhook}
                    disabled={createWebhook.isPending || !webhookUrl || !webhookSecret}
                  >
                    {createWebhook.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {webhooksLoading ? (
              <p className="text-center text-muted-foreground py-4">{t('common.loading')}</p>
            ) : !webhooks || webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('webhooks.noWebhooks')}
              </p>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.webhookId}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" dir="ltr">
                          {webhook.url}
                        </p>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          {t('webhooks.active')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{webhook.events.join(', ')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.webhookId)}
                      disabled={deleteWebhook.isPending}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
