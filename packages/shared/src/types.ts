/**
 * Shared API response types used by both merchant-dashboard and customer-portal.
 */
import type { CustomerTierLevel } from './tier-config';

export type PerkType =
  | 'EARLY_ACCESS'
  | 'EXCLUSIVE_PRODUCT'
  | 'EVENT'
  | 'BIRTHDAY_REWARD'
  | 'SPEND_BONUS'
  | 'REFERRAL_BONUS'
  | 'HAPPY_HOUR'
  | 'WIN_BACK'
  | 'WELCOME_OFFER';

export interface MerchantPerk {
  id: string;
  type: PerkType;
  title: string;
  description: string;
  requiredTier: CustomerTierLevel;
  capacityLimit?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerPerkView {
  perkId: string;
  type: PerkType;
  title: string;
  description: string;
  requiredTier: CustomerTierLevel;
  capacityLimit?: number;
  isUnlocked: boolean;
  merchantId: string;
  merchantName: string;
  // Campaign enrichment
  campaignId?: string;
  campaignMultiplier?: number;
  campaignEndDate?: string;
  campaignMinPurchaseAmount?: number;
  campaignMaxUsesPerCustomer?: number;
  campaignUsesRemaining?: number;
  campaignTerms?: string;
  isExhausted?: boolean;
}

export interface MerchantLocation {
  locationId: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  createdAt: string;
}

export interface WalletConfig {
  primaryColor: string;
  backgroundColor: string;
  logoUrl?: string;
}

export interface MerchantResponse {
  merchantId: string;
  businessName: string;
  contactName?: string;
  email: string;
  phone: string;
  tier: string;
  status: string;
  verifiedAt?: string;
  activePerks?: MerchantPerk[];
  walletConfig?: WalletConfig;
  loyaltyConfig: {
    pointsPerSAR: number;
    globalPointsPerSAR: number;
    minimumPurchase: number;
    redemptionRate: number;
    allowPartialRedemption: boolean;
    minimumRedemption: number;
    welcomeBonus: number;
    enableMultiLocation: boolean;
  };
  smsQuota: {
    monthlyLimit: number;
    currentUsage: number;
    resetDate: string;
  };
  totalCustomers: number;
  totalTransactions: number;
  locations: MerchantLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  customerId: string;
  name?: string;
  dateOfBirth?: string;
  phone: string;
  status: string;

  // Points
  globalPointsBalance: number;
  globalLifetimePoints: number;

  // Tier
  currentTier: string;
  tierDisplayName: string;
  tierColor: string;
  monthlyProgress: number;
  pointsToNextTier: number;
  campaignMultiplier?: number;
  campaignName?: string;
  earningMultiplier: number;
  isDecayImmune: boolean;
  tierLastUpdatedAt: string;
  monthlyProgressResetAt: string;

  // Decay tracking
  lastNetworkActivity: string;
  nextDecayDate: string;
  globalPointsDecayPhase: number;
  decayStartDate?: string;
  lastDecayAppliedAt?: string;
  lastInactivityWarningSentAt?: string;
  monthsOfInactivity: number;

  enrollments: CustomerEnrollment[];
  createdAt: string;
  updatedAt: string;
}

/** Merchant-scoped customer view — excludes global points, other merchants' data */
export interface MerchantScopedCustomerResponse {
  customerId: string;
  name?: string;
  phone: string;
  status: string;
  currentTier: string;
  tierDisplayName: string;
  tierColor: string;
  nextDecayDate: string;
  enrollment: CustomerEnrollment;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerEnrollment {
  merchantId: string;
  enrolledAt: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  lastTransactionAt?: string;
  welcomeBonusApplied: boolean;
}

export interface TransactionResponse {
  transactionId: string;
  merchantId: string;
  customerId: string;
  locationId?: string;
  type: string;
  status: string;
  amount: number;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  metadata: Record<string, string>;
  campaignId?: string;
  campaignName?: string;
  campaignMultiplier?: number;
  breakdown?: PointsBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantStatsResponse {
  totalTransactions: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  averageTransactionValue: number;
}

export interface PointsBreakdown {
  purchaseAmount: number;
  pointsPerSAR: number;
  basePoints: number;
  tierMultiplier: number;
  tierName: string;
  campaignName?: string;
  campaignMultiplier?: number;
  bonusPointsCap?: number;
  bonusPointsBeforeCap?: number;
  finalMerchantPoints: number;
  finalGlobalPoints: number;
}

export interface RecordPurchaseResponse {
  transactionId: string;
  merchantPoints: number;
  globalPoints: number;
  newMerchantBalance: number;
  newGlobalBalance: number;
  currentTier: string;
  tierUpgrade: boolean;
  earningMultiplier: number;
  isDecayImmune: boolean;
  pointsToNextTier: number;
  campaignMultiplier?: number;
  campaignName?: string;
  breakdown?: PointsBreakdown;
  message: string;
}

export interface RedeemPointsResponse {
  transactionIds: string[];
  merchantPointsRedeemed: number;
  globalPointsRedeemed: number;
  totalPointsRedeemed: number;
  sarValue: number;
  newMerchantBalance: number;
  newGlobalBalance: number;
  currentTier: string;
  message: string;
}

export interface PaginatedResponse<T> {
  customers?: T[];
  transactions?: T[];
  items?: T[];
  count: number;
  nextToken?: string;
}

export interface AnalyticsDataPoint {
  period: string;
  transactionCount: number;
  earnCount: number;
  redeemCount: number;
  revenue: number;
  pointsEarned: number;
  pointsRedeemed: number;
  uniqueCustomers: number;
}

export interface PublicMerchantPerk {
  title: string;
  type: PerkType;
  requiredTier: CustomerTierLevel;
}

export interface PublicMerchantSummary {
  merchantId: string;
  businessName: string;
  tier: string;
  loyaltyConfig: {
    pointsPerSAR: number;
    welcomeBonus: number;
    redemptionRate: number;
  };
  locations: Array<{ name: string; city: string }>;
  totalCustomers: number;
  activePerks: PublicMerchantPerk[];
}

export interface PublicMerchantDetail {
  merchantId: string;
  businessName: string;
  tier: string;
  loyaltyConfig: {
    pointsPerSAR: number;
    welcomeBonus: number;
    redemptionRate: number;
  };
  locations: Array<{
    locationId: string;
    name: string;
    address: string;
    city: string;
  }>;
  totalCustomers: number;
  activePerks: MerchantPerk[];
}

export interface CustomerMerchantView {
  merchantId: string;
  businessName: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  enrolledAt: string;
  transactionCount: number;
  lastTransactionAt?: string;
  walletConfig?: WalletConfig;
}

export interface AnalyticsData {
  summary: {
    totalTransactions: number;
    totalRevenue: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    uniqueCustomers: number;
    averageTransactionValue: number;
  };
  trends: AnalyticsDataPoint[];
}

// --- Customer Insights ---

export interface CustomerInsights {
  birthdayReward: { count: number };
  winBack: { count: number };
  welcomeOffer: { count: number };
  totalCustomers: number;
}

/** @deprecated Use CustomerInsights instead */
export type PerkInsights = CustomerInsights;

// --- Campaigns ---

export type CampaignType =
  | 'DOUBLE_POINTS'
  | 'TRIPLE_POINTS'
  | 'BIRTHDAY_REWARD'
  | 'WIN_BACK'
  | 'WELCOME'
  | 'HAPPY_HOUR'
  | 'CUSTOM';

export interface CampaignResponse {
  campaignId: string;
  merchantId: string;
  type: CampaignType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  isActive: boolean;
  message?: string;
  linkedPerkId?: string;
  targetTiers?: string[];
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
  termsMessage?: string;
  createdAt: string;
}

// --- Tier Breakdown ---

export interface TierBreakdownResponse {
  BRONZE: number;
  GOLD: number;
  PLATINUM: number;
  DIAMOND: number;
  total: number;
}

// --- Challenges ---

export type ChallengeType = 'WEEKLY_VISIT_STREAK';

export interface ChallengeProgressResponse {
  weeklyVisitCount: number;
  weeklyVisitDates: string[];
  lastStreakResetAt: string | null;
}

// --- Webhooks ---

export type WebhookEventType = 'REDEMPTION';

export interface WebhookConfigResponse {
  webhookId: string;
  merchantId: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
}

// --- Gift Points ---

export interface GiftPointsRequest {
  recipientPhone: string;
  points: number;
  message?: string;
  idempotencyKey: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlatformCounts {
  ios: number;
  android: number;
  web: number;
}
