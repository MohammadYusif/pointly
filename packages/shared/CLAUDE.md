# Shared Package – `packages/shared`

Pure TypeScript utilities and types shared between merchant-dashboard and customer-portal. No React, no I/O. Import as `@pointly/shared`.

## Commands

```bash
pnpm build        # tsc → dist/ (required before consuming apps can import)
pnpm type-check   # tsc --noEmit
```

Turbo handles build ordering — consuming apps depend on `@pointly/shared` being built first.

## Key Exports

### Constants (`constants.ts`)
`CURRENCY_CODE = 'SAR'`, `LOCALE_AR = 'ar-SA'`, `LOCALE_EN = 'en-SA'`, `DEFAULT_REDEMPTION_RATE = 0.1`

### Tier Config (`tier-config.ts`)
Frontend mirror of `apps/api/src/domain/config/TierConfig.ts` — **manually kept in sync**.

```ts
CUSTOMER_TIERS   // Record<tier, { displayName, monthlyMinimum, earningMultiplier, color, tailwindColor }>
TIER_ORDER       // ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND']
getTierColor(tier)    // Tailwind text class, e.g. 'text-yellow-600'
getTierBgColor(tier)  // Tailwind bg class, e.g. 'bg-yellow-100'
getTierTarget(tier)   // monthlyMinimum of next tier (0 if Diamond)
```

### Phone (`phone.ts`)
```ts
normalizePhone(raw)  // → E.164 (+966XXXXXXXXX). Handles 05X, 5X, 966X, already E.164
formatPhone(phone)   // → '+966 50 111 1111' display format
```
**Always call `normalizePhone()` before any API call that uses phone.**

### Formatting (`formatting.ts`)
`formatPoints(n)`, `formatCurrency(n)`, `formatDate(date)`, `formatRelativeTime(date)`, `formatPeriodLabel(period, language)`

### API Response Types (`types.ts`)
Key types: `MerchantResponse`, `CustomerResponse`, `MerchantScopedCustomerResponse`, `CustomerEnrollment`, `TransactionResponse`, `RecordPurchaseResponse`, `PaginatedResponse<T>`, `ApiResponse<T>`, `AnalyticsData`, `MerchantPerk`, `CustomerPerkView`, `GiftPointsRequest`, `ChallengeProgressResponse`, `MerchantSignupRequest/Response/Status`, `PlatformCounts`.

Note: `ChallengeProgressResponse` has no `streakCount` field — only `weeklyVisitCount`, `weeklyVisitDates`, `lastStreakResetAt`.

### Badges (`badges.ts`)
`getTypeBadge(type)`, `getStatusBadge(status)` → `{ label, variant, className }`

## Rules

1. If tier thresholds change: update both `tier-config.ts` here AND `apps/api/src/domain/config/TierConfig.ts`
2. If API response shape changes: update `types.ts` and check both dashboard and portal
3. All functions are pure — no state, no network, no DOM
4. Always `import { ... } from '@pointly/shared'` — never from deep paths

## i18n Package (`@pointly/i18n`)

```ts
import { DirectionProvider, useDirection, useTranslation } from '@pointly/i18n';
```

- `<DirectionProvider defaultLanguage="ar">` — wraps apps using `useRTL()`. Reads `localStorage['pointly-language']` on mount.
- `useDirection()` — `{ direction, language, setLanguage, toggleDirection, isRTL }`. Throws outside provider.
- `useTranslation()` — `{ t, language, locale, formatNumber, formatCurrency, formatDate, formatRelativeTime }`. `t(key, params?)` accepts dot-notation and `{{param}}` interpolation. Locales in `packages/i18n/src/locales/`.

Landing page (`apps/landing`) uses its own `src/i18n/translations.ts` — no `@pointly/i18n`.

## HTTP Client (`@pointly/http-client`)

```ts
const fetchApi = createFetchApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  getToken: () => getAccessToken(),   // returns ID token JWT or null
  onUnauthorized: () => signOut(),
});
const data = await fetchApi<CustomerResponse>('/v1/me');
```

Injects `Authorization: Bearer <token>`, sets `Content-Type: application/json` when body present, throws on non-OK.
