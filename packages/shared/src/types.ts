/**
 * Shared API response types used by both merchant-dashboard and customer-portal.
 */

export type PerkType = 'EARLY_ACCESS' | 'EXCLUSIVE_PRODUCT' | 'EVENT';
type CustomerTierLevel = 'BRONZE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

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
}

export interface MerchantLocation {
  locationId: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  createdAt: string;
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
  currentTier: string;
  globalPointsBalance: number;
  globalLifetimePoints: number;
  monthlyProgress: number;
  nextDecayDate?: string;
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
  consentStatus: string;
  consentGrantedAt?: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  lastTransactionAt?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface MerchantStatsResponse {
  totalTransactions: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  averageTransactionValue: number;
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
