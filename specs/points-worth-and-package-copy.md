# Points Worth Change + Package Copy Cleanup

## Problem

1. Points were worth too little: 100 points = 1 SAR (`redemptionRate = 0.01`).
   New value: **10 points = 1 SAR** (`redemptionRate = 0.1`).
2. The landing-page pricing packages advertised internal mechanics that are
   noise for a merchant deciding on a plan: "1 point per SAR spent",
   "Min purchase: X SAR", "X-point welcome bonus".
3. Minimum purchase and welcome bonus should not be part of the package
   offering at all — defaults are now 0 (disabled) for every plan.

## Decisions

- `redemptionRate` default changes everywhere a default/fallback exists:
  `Merchant.getDefaultLoyaltyConfig`, `MerchantRepository` fallback,
  `DEFAULT_REDEMPTION_RATE` in `@pointly/shared`, redeem page fallback,
  seed data, docs.
- `minimumPurchase` and `welcomeBonus` defaults/fallbacks become 0 for all
  plans. The fields and their enforcement code paths stay (a merchant could
  still be configured with them) — only the per-plan defaults are removed.
- Landing pricing cards (en + ar) keep only: locations, SMS quota,
  network access.

## Constraints / Notes

- Existing merchants in DynamoDB keep their stored `loyaltyConfig` values —
  this change only affects new merchants and records missing the fields.
  A data migration is needed if existing merchants should move to 0.1.
- `minimumRedemption` (100/50/25 points) was left unchanged; at the new rate
  those floors are now worth 10/5/2.5 SAR.
