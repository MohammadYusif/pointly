import type { MerchantTier } from '../entities/Merchant';

/**
 * Server-side source of truth for merchant plan prices.
 * Amounts are in halalas (1 SAR = 100 halalas).
 * The API uses these values when creating Moyasar payments — never trusts client-submitted amounts.
 */
export const PLAN_PRICES: Record<Exclude<MerchantTier, 'ENTERPRISE'> | 'ENTERPRISE', number> = {
  BASIC: 7500, // 75 SAR
  PROFESSIONAL: 10500, // 105 SAR
  ENTERPRISE: 17500, // 175 SAR
} as const;

export type PlanType = keyof typeof PLAN_PRICES;
