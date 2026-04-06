import type { CampaignResponse, CampaignType } from '@/types/api';
import { Cake, Clock, Flame, Heart, Sliders, Sparkles, Zap } from 'lucide-react';

export type CampaignIconComponent = React.ComponentType<{ className?: string }>;

export const CAMPAIGN_TYPE_META: {
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

export const CAMPAIGN_DEFAULTS: Record<string, { durationDays: number; multiplier: number }> = {
  DOUBLE_POINTS: { durationDays: 7, multiplier: 2 },
  TRIPLE_POINTS: { durationDays: 3, multiplier: 3 },
  BIRTHDAY_REWARD: { durationDays: 365, multiplier: 2 },
  WIN_BACK: { durationDays: 14, multiplier: 3 },
  WELCOME: { durationDays: 7, multiplier: 2 },
  HAPPY_HOUR: { durationDays: 1, multiplier: 2 },
};

export const ALL_TIERS = ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] as const;

export const TIER_STYLES: Record<string, string> = {
  BRONZE: 'bg-amber-50 text-amber-700 border border-amber-200',
  GOLD: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  PLATINUM: 'bg-blue-50 text-blue-700 border border-blue-200',
  DIAMOND: 'bg-primary/10 text-primary border border-primary/20',
};

export type FilterTab = 'all' | 'active' | 'scheduled' | 'expired';
export type SortOption = 'newest' | 'multiplier' | 'name';
export type PlatformFilter = 'all' | 'ios' | 'android';

export function getCampaignStatus(
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

export function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export function buildLimitsPayload(
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

export function getDefaultDates(durationDays: number): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return { start: formatDateInput(now), end: formatDateInput(end) };
}
