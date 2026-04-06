'use client';

import type { CampaignType } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Users, Zap } from 'lucide-react';
import { ALL_TIERS, CAMPAIGN_TYPE_META, TIER_STYLES, getCampaignStatus } from './constants';

export function CampaignStatusBadge({
  campaign,
}: {
  campaign: { isActive: boolean; startDate: string; endDate: string };
}) {
  const { t } = useTranslation();
  const status = getCampaignStatus(campaign as Parameters<typeof getCampaignStatus>[0]);

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

export function CampaignTypeBadge({ type }: { type: CampaignType | undefined }) {
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

export function TierBadges({ tiers }: { tiers: string[] | undefined }) {
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

export function MultiplierBadge({ multiplier }: { multiplier: number }) {
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
