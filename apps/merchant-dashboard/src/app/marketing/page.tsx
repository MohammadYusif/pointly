'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { CampaignCard, CreateCampaignForm } from '@/components/marketing';
import { CAMPAIGN_TYPE_META, getCampaignStatus } from '@/components/marketing';
import type { FilterTab, SortOption } from '@/components/marketing';
import { useCampaigns, useDeactivateCampaign, usePushStats } from '@/hooks/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignType } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useRTL } from '@pointly/ui';
import { Clock, Megaphone, Plus, Search, Smartphone, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function MarketingPage() {
  const { t } = useTranslation();
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

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    let list = campaigns;

    if (filter !== 'all') {
      list = list.filter((c) => getCampaignStatus(c) === filter);
    }
    if (typeFilter !== 'all') {
      list = list.filter((c) => c.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q),
      );
    }
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-accessible">{stats.active}</p>
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
          <div className="flex gap-1 mb-4 p-1 bg-muted/50 rounded-lg overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm rounded-md transition-colors ${
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
