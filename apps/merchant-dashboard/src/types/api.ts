export interface MerchantResponse {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  tier: string;
  status: string;
  verifiedAt?: string;
  loyaltyConfig: {
    pointsPerSAR: number;
    globalPointsPerSAR: number;
    minimumPurchase: number;
    redemptionRate: number;
    minimumRedemption: number;
    welcomeBonus: number;
  };
  smsQuota: {
    used: number;
    limit: number;
    resetAt: string;
  };
  totalCustomers: number;
  totalTransactions: number;
  locations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  customerId: string;
  name: string;
  phone: string;
  status: string;
  currentTier: string;
  globalPointsBalance: number;
  globalLifetimePoints: number;
  monthlyProgress: number;
  enrollments: CustomerEnrollment[];
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
