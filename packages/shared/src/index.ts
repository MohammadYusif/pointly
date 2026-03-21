// Pointly Shared Types and Utilities
export const VERSION = '1.0.0';

// Constants
export { CURRENCY_CODE, LOCALE_AR, LOCALE_EN, DEFAULT_REDEMPTION_RATE } from './constants';

// Customer Tier Configuration
export {
  CUSTOMER_TIERS,
  TIER_ORDER,
  getTierColor,
  getTierTarget,
  getTierBgColor,
} from './tier-config';
export type { CustomerTierLevel } from './tier-config';

// Phone Utilities
export { normalizePhone, formatPhone, isValidSaudiPhone } from './phone';

// Badge Configuration
export { getTypeBadge, getStatusBadge } from './badges';
export type { BadgeConfig } from './badges';

// Formatting Utilities
export {
  formatPoints,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPeriodLabel,
} from './formatting';

// API Response Types
export type {
  WalletConfig,
  PerkType,
  MerchantPerk,
  CustomerPerkView,
  MerchantLocation,
  MerchantResponse,
  CustomerResponse,
  MerchantScopedCustomerResponse,
  CustomerEnrollment,
  TransactionResponse,
  MerchantStatsResponse,
  RecordPurchaseResponse,
  RedeemPointsResponse,
  PaginatedResponse,
  AnalyticsDataPoint,
  AnalyticsData,
  PublicMerchantPerk,
  PublicMerchantSummary,
  PublicMerchantDetail,
  CustomerMerchantView,
  PerkInsights,
  CustomerInsights,
  CampaignType,
  CampaignResponse,
  TierBreakdownResponse,
  ChallengeType,
  ChallengeProgressResponse,
  WebhookEventType,
  WebhookConfigResponse,
  GiftPointsRequest,
  MerchantGiftPointsRequest,
  MerchantGiftPointsResponse,
  PointsBreakdown,
  ApiResponse,
  PlatformCounts,
} from './types';
