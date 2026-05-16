# Merchant Dashboard – `apps/merchant-dashboard`

Next.js 15 admin panel. Email/password login (Cognito), manage customers, purchases, redemptions, analytics.

## Commands

```bash
pnpm dev          # next dev, port 3000
pnpm build        # next build
pnpm type-check   # tsc --noEmit
pnpm lint         # biome check
```

## Directory Structure

```
src/
  app/                      # Next.js App Router pages
    page.tsx                # Dashboard (KPIs, charts)
    login/page.tsx          # Email/password login
    customers/              # List + detail (summary, transactions, export)
    transactions/page.tsx   # All transactions with filters
    manual-entry/page.tsx   # Record purchase by phone
    redeem/page.tsx         # Redeem points
    settings/page.tsx       # Profile, locations, perks, wallet branding, push stats
    marketing/page.tsx      # Campaigns + push notification targeting
    signup-complete/page.tsx # Public — polls signup status after Moyasar payment
  components/
    DashboardLayout.tsx     # Sidebar + header shell
    AppSkeleton.tsx         # Full-page skeleton (transparent — body bg shows through)
    analytics/              # Recharts-based chart components
    receipt/                # ThermalReceipt.tsx + receipt-print.css
    ui/                     # Local: AnimatedNumber, ClientDate, Skeleton, button, card
  hooks/api/                # TanStack Query hooks — all data fetching goes here
    use-analytics.ts, use-campaigns.ts, use-customers.ts,
    use-merchant.ts, use-purchases.ts, use-signup-status.ts,
    use-wallet.ts, use-webhooks.ts
  lib/
    api.ts          # All API client functions (fetchApi base + named namespaces)
    auth.ts         # Cognito session helpers
    auth-context.tsx # AuthProvider + useAuth hook
    receipt-pdf.ts  # jsPDF receipt generation (client-side only)
    utils.ts        # cn() helper
  types/api.ts      # Re-exports from @pointly/shared (not local declarations)
```

## Auth Flow

`amazon-cognito-identity-js`, email/password SRP auth.

- `signIn()` returns a discriminated union: normal session OR `{ requiresNewPassword, cognitoUser }` for first-login after `AdminCreateUser`
- `completeNewPassword()` handles the NEW_PASSWORD_REQUIRED flow
- `getAccessToken()` returns the **ID token** JWT (not access token) — carries `custom:merchantId`
- `/signup-complete` is whitelisted as a public path (no auth redirect)

Env vars: `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_API_URL`

## API Layer (`lib/api.ts`)

`fetchApi()` attaches `Authorization: Bearer <ID token>` and auto-calls `signOut()` on 401.

Namespaces: `signupApi`, `merchantApi`, `customerApi`, `purchaseApi`, `perkApi`, `campaignApi`, `webhookApi`, `pushApi`. See `lib/api.ts` for individual methods.

Never call `lib/api.ts` directly from components — always go through `hooks/api/`.

## Styling

- **Tailwind v4** — no `tailwind.config.js`, theme tokens in `globals.css` via `@theme {}`
- **Body background**: dot grid + teal gradient in `@layer base` — not on a wrapper div
- **`.dashboard-bg`**: transparent wrapper; scopes `header` frosted-glass via child selectors
- **`.login-wrapper`**: adds centred teal `::before` glow
- **Card glassmorphism**: `[data-slot="card"]` global selector — Card has `data-slot="card"` on root
- **AppSkeleton**: no bg class — body bg shows through intentionally

## Pages

| Route | Purpose | Key hook |
|-------|---------|----------|
| `/` | KPIs + charts | `useMerchantStats`, `useMerchantAnalytics` |
| `/customers` | Searchable list | `useMerchantCustomers` |
| `/customers/detail?id=` | Profile + tx history | `useCustomer`, `useCustomerTransactions` |
| `/transactions` | Full log | `useMerchantTransactions` |
| `/manual-entry` | Record purchase | `useRecordPurchase` |
| `/redeem` | Point redemption | `useRedeemPoints` |
| `/settings` | Profile, locations, perks, wallet | `useMerchant`, `usePerks`, `usePushStats` |
| `/marketing` | Campaigns + push | `useCampaigns` |
| `/signup-complete` | Post-payment polling (public) | `useSignupStatus` |

## Gotchas

- `ClientDate` wraps date rendering to avoid hydration mismatch
- `AnimatedNumber` uses RAF — wrap in `<Suspense>` in RSC trees
- Receipt PDF uses `document.getElementById` — client-side only
- Phone: always `normalizePhone()` from `@pointly/shared` before API calls
- Pagination: `{ data: [...], nextToken }` — pass `nextToken` as query param for next page
- `idempotencyKey` for purchases: `crypto.randomUUID()` client-side before calling `purchaseApi.record()`
- Form labels: must use `htmlFor`/`id` pairs — Biome enforces `noLabelWithoutControl`
