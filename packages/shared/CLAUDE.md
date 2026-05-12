# Shared Package – `packages/shared`

## Commands

```bash
pnpm build        # tsc → dist/ (required before consuming apps can import)
pnpm type-check   # tsc --noEmit
```

> Turbo handles build ordering — consuming apps depend on `@pointly/shared` being built first.

Pure TypeScript utilities and types shared between `merchant-dashboard` and `customer-portal`. No React, no framework, no I/O. Imported as `@pointly/shared`.

## Files

```
src/
  index.ts          # Re-exports everything — always import from here
  constants.ts      # CURRENCY_CODE, LOCALE_AR, LOCALE_EN, DEFAULT_REDEMPTION_RATE
  tier-config.ts    # Frontend tier mirror (CUSTOMER_TIERS, TIER_ORDER, helpers)
  types.ts          # All shared API response interfaces
  phone.ts          # normalizePhone(), formatPhone()
  formatting.ts     # formatPoints(), formatCurrency(), formatDate(), formatRelativeTime()
  badges.ts         # getTypeBadge(), getStatusBadge() → BadgeConfig
```

## Key Exports

### Constants (`constants.ts`)
```ts
CURRENCY_CODE = 'SAR'
LOCALE_AR = 'ar-SA'
LOCALE_EN = 'en-SA'
DEFAULT_REDEMPTION_RATE = 0.01  // 0.01 SAR per point
```

### Tier Config (`tier-config.ts`)

Frontend mirror of `apps/api/src/domain/config/TierConfig.ts`. **Must stay in sync manually** if tier thresholds change.

```ts
CUSTOMER_TIERS        // Record of tier level → { displayName, monthlyMinimum, earningMultiplier, color, tailwindColor }
TIER_ORDER            // ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] — ordered low to high
getTierColor(tier)    // returns Tailwind text class e.g. 'text-yellow-600' — accepts 'GOLD' or 'Gold'
getTierBgColor(tier)  // returns Tailwind bg class e.g. 'bg-yellow-100' — use for tier badge backgrounds
getTierTarget(tier)   // returns monthlyMinimum of the next tier (0 if already Diamond)
```

### Phone Utilities (`phone.ts`)

```ts
normalizePhone(raw)  // → E.164 format (+966XXXXXXXXX)
                     // handles: '05XXXXXXXX', '5XXXXXXXX', '966XXXXXXXX', already E.164
formatPhone(phone)   // → '+966 50 111 1111' display format
```

**Always use `normalizePhone()` before any API call or DynamoDB lookup that uses phone number.**

### Formatting (`formatting.ts`)

```ts
formatPoints(n)              // '1,234' — en-SA locale
formatCurrency(n)            // 'SAR 12.50' — en-SA locale
formatDate(date)             // 'Jan 1, 2025, 3:00 PM'
formatRelativeTime(date)     // 'just now', '5 minutes ago', etc.
formatPeriodLabel(period, language)  // Month/day label for chart axes
```

### API Response Types (`types.ts`)

Key interfaces used by both frontends:

| Type | Description |
|------|-------------|
| `MerchantResponse` | Full merchant object including `loyaltyConfig`, `locations`, `smsQuota` |
| `CustomerResponse` | Full customer view (global points, tier, enrollments) |
| `MerchantScopedCustomerResponse` | Merchant-safe customer view — no global points, only that merchant's enrollment |
| `CustomerEnrollment` | Per-merchant enrollment snapshot |
| `TransactionResponse` | Single transaction record |
| `RecordPurchaseResponse` | Response after recording a purchase (includes `tierUpgrade`, `pointsToNextTier`) |
| `PaginatedResponse<T>` | Paginated list with optional `nextToken` |
| `ApiResponse<T>` | Generic wrapper `{ data: T }` — used as the standard fetch return type |
| `AnalyticsData` | Summary + trends array for charts |
| `MerchantPerk` / `CustomerPerkView` | Perk as seen by merchant vs customer |
| `PublicMerchantSummary` | Minimal merchant info for customer-facing discovery |
| `CustomerMerchantView` | Customer's view of an enrolled merchant |
| `PlatformCounts` | `{ ios: number; android: number; web: number }` — push subscription breakdown per merchant |
| `GiftPointsRequest` | `{ merchantId, points, idempotencyKey }` — `idempotencyKey` is required |
| `ChallengeProgressResponse` | `{ weeklyVisitCount, weeklyVisitDates, lastStreakResetAt }` — note: no `streakCount` field |

### Badges (`badges.ts`)

```ts
getTypeBadge(type)    // 'EARN' | 'REDEEM' → { label, variant, className }
getStatusBadge(status) // 'ACTIVE' | 'INACTIVE' | ... → { label, variant, className }
```

## Rules When Modifying

1. **Tier thresholds** — if you change `tier-config.ts`, also update `apps/api/src/domain/config/TierConfig.ts`. They are manually kept in sync.
2. **API types** — if the API changes a response shape, update `types.ts` here and check both dashboard and portal
3. **No side effects** — all functions are pure; no state, no network calls, no DOM access
4. **Build** — `packages/shared` must be built before apps that depend on it (`turbo run build` handles dependency ordering)
5. **Import from index** — always `import { ... } from '@pointly/shared'`, never from deep paths like `@pointly/shared/src/phone`

## i18n Package (`@pointly/i18n`)

Direction and translation context for all frontends. No sub-CLAUDE.md — documented here as the root delegates to this file.

```ts
import { DirectionProvider, useDirection, useTranslation } from '@pointly/i18n';
```

- **`<DirectionProvider defaultLanguage="ar">`** — must wrap any app that uses `useRTL()` from `@pointly/ui`. Reads `localStorage['pointly-language']` on mount and syncs `document.documentElement.dir/lang`. Default language is `'ar'`.
- **`useDirection()`** — returns `{ direction, language, setLanguage, toggleDirection, isRTL }`. Throws if called outside `DirectionProvider`. Consumed internally by `@pointly/ui`'s `useRTL()`.
- **`useTranslation()`** — returns `{ t, language, locale, formatNumber, formatCurrency, formatDate, formatRelativeTime }`. `t(key, params?)` accepts dot-notation paths (e.g. `'common.save'`) and `{{param}}` interpolation. Translation JSON files live in `packages/i18n/src/locales/en.json` and `ar.json`.

**Note**: The landing page (`apps/landing`) uses its own `src/i18n/translations.ts` instead of `@pointly/i18n` — it is a static export with no React context.

## HTTP Client (`@pointly/http-client`)

Thin fetch wrapper factory used by both dashboards. Not part of `@pointly/shared` itself,
but documented here as the root CLAUDE.md points here for usage.

```ts
import { createFetchApi } from '@pointly/http-client';

const fetchApi = createFetchApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  getToken: () => getAccessToken(),   // returns ID token JWT or null
  onUnauthorized: () => signOut(),    // called on 401
});

// Then call like:
const data = await fetchApi<CustomerResponse>('/v1/me');
```

`createFetchApi` injects `Authorization: Bearer <token>` automatically, sets
`Content-Type: application/json` when a body is present, and throws on non-OK responses.
