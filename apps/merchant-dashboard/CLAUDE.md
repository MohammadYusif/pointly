# Merchant Dashboard – `apps/merchant-dashboard`

Next.js 15 admin panel for merchants. Merchants log in with email/password (Cognito), then manage customers, record purchases, redeem points, and view analytics.

## Commands

```bash
pnpm dev              # next dev on port 3000
pnpm build            # next build
pnpm type-check       # tsc --noEmit
pnpm lint             # biome check
```

## Directory Structure

```
src/
  app/                      # Next.js App Router pages
    page.tsx                # Dashboard home (KPIs, charts)
    layout.tsx              # Root layout — QueryClientProvider + AuthProvider
    providers.tsx           # TanStack Query + Auth context wiring
    login/page.tsx          # Email/password login form
    customers/page.tsx      # Customer list + search
    customers/detail/       # Customer detail: summary, transactions, export
    transactions/page.tsx   # All transactions with filters
    manual-entry/page.tsx   # Record purchase by phone number
    redeem/page.tsx         # Redeem points for a customer
    settings/page.tsx       # Merchant profile, locations, perks, wallet card branding, push stats
    marketing/page.tsx      # Campaign management + push notification targeting
    billing/page.tsx        # Billing info (static placeholder)
    signup-complete/page.tsx # Public page — polls signup status after Moyasar payment redirect
  components/
    DashboardLayout.tsx     # Sidebar nav + header shell
    AppSkeleton.tsx         # Full-page loading skeleton (no bg class — shows body bg)
    analytics/              # Chart components (Recharts-based)
    receipt/                # ThermalReceipt.tsx + receipt-print.css
    ui/                     # Local UI: AnimatedNumber, ClientDate, Skeleton, button, card
    Logo.tsx                # Pointly logo component
  hooks/api/                # TanStack Query hooks (all API calls go here)
    use-analytics.ts
    use-campaigns.ts
    use-customers.ts
    use-merchant.ts
    use-purchases.ts
    use-signup-status.ts    # useSignupStatus(paymentId) — polls /v1/merchants/signup-status, 2s refetch while pending
    use-wallet.ts
    use-webhooks.ts
  lib/
    api.ts          # All API client functions (merchantApi, customerApi, purchaseApi, perkApi, campaignApi, webhookApi, pushApi)
    auth.ts         # Cognito session helpers (signIn, signOut, getCurrentSession, getAccessToken)
    auth-context.tsx # AuthProvider + useAuth hook
    receipt-pdf.ts  # jsPDF receipt generation
    utils.ts        # cn() helper
  types/
    api.ts          # Re-export relay — imports types from @pointly/shared and re-exports them (not a local type definition file)
```

## Auth Flow

Uses `amazon-cognito-identity-js` with **email/password** (SRP auth).

```
lib/auth.ts
  signIn(email, password)             → SignInResult (see below)
  completeNewPassword(user, newPwd)   → void — handles NEW_PASSWORD_REQUIRED after AdminCreateUser
  signOut()                           → clears Cognito + cookie
  getCurrentSession()                 → returns session or null
  getAccessToken()                    → returns ID token JWT (NOT access token)
  setAuthCookie()                     → sets pointly-auth cookie (30-day, SameSite=Lax)

// SignInResult discriminated union:
type SignInResult =
  | { session: CognitoUserSession; merchant: MerchantInfo }         // normal login
  | { requiresNewPassword: true; cognitoUser: CognitoUser }         // first login after AdminCreateUser

lib/auth-context.tsx
  AuthProvider               → wraps app, calls getCurrentSession on mount
  useAuth()                  → { merchant, isLoading, signIn, signOut }
  // /signup-complete is whitelisted as a public path — no auth redirect
```

**NEW_PASSWORD_REQUIRED flow**: Merchants created via `AdminCreateUser` (Moyasar signup) must set a new password on first login. `login/page.tsx` has a 3-step flow: credentials → new password form → redirect to dashboard. Catch error code `NEW_PASSWORD_REQUIRED` from `signIn()` and call `completeNewPassword()` with the `cognitoUser` returned.

**Critical**: The API expects the **ID token** (not the access token). The ID token contains `custom:merchantId` in its payload. `getAccessToken()` returns `session.getIdToken().getJwtToken()`.

Env vars needed:
```
NEXT_PUBLIC_COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID
NEXT_PUBLIC_API_URL           # e.g. https://api.pointly.sa or http://localhost:3000
```

## API Layer (`lib/api.ts`)

All API calls go through `fetchApi()`, which:
1. Gets the ID token via `getAccessToken()`
2. Attaches `Authorization: Bearer <token>`
3. Auto-calls `signOut()` on 401

Exported namespaces:
- `signupApi` — `getStatus(paymentId)` — public, no auth header, used by `/signup-complete` page
- `merchantApi` — `getById`, `getCustomers`, `getTransactions`, `getStats`, `getAnalytics`, `getLocationAnalytics`, `registerCustomer`, `getPendingConsents`, `getCustomerInsights`, `getPerkInsights`, `getTierBreakdown`, `getCustomerConsent`, `update`, `addLocation`, `uploadLogo`
- `customerApi` — `getById`, `getByPhone`, `create`, `getTransactions`, `getStats`
- `purchaseApi` — `record`, `getById`, `redeem`
- `perkApi` — `getPerks`, `createPerk`, `updatePerk`, `deletePerk`
- `campaignApi` — `create`, `getById`, `update`, `delete`
- `webhookApi` — `create`, `list`, `delete`
- `pushApi` — `getStats` (platform counts per merchant)

## Data Fetching (TanStack Query v5)

All data fetching goes through hooks in `hooks/api/`. Never call `lib/api.ts` directly from a component.

```ts
// Pattern: each hook uses useQuery or useMutation
const { data, isLoading } = useMerchant(merchantId);
const { mutate: recordPurchase } = useRecordPurchase();
```

Query keys follow `['merchant', merchantId]` pattern. Invalidate on mutation success.

## Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss`
- No `tailwind.config.js` — config is in `globals.css` via `@theme {}`
- **Body background**: dot grid + teal radial gradient set in `@layer base` in `globals.css` — **not** on a wrapper div
- **`.dashboard-bg`**: transparent wrapper class; used for the sidebar/content shell. Scopes `header` frosted-glass via child selectors
- **`.login-wrapper`**: adds a centred teal `::before` glow on the login page
- **Card glassmorphism**: applied globally via `[data-slot="card"]` selector — Card already has `data-slot="card"` on its root
- **Dark mode**: `.dark body {}` in `@layer base`
- **AppSkeleton**: intentionally has no background class — the body bg shows through

Local UI components in `src/components/ui/` (button, card, AnimatedNumber, ClientDate, Skeleton) take priority over `@pointly/ui` when this app needs app-specific variants.

## Key Components

### `DashboardLayout.tsx`
Sidebar nav + top header. Reads `useAuth()` for merchant name/tier. Navigation items map to the page routes above.

### `ThermalReceipt.tsx` + `receipt-pdf.ts`
Renders a styled receipt. `receipt-pdf.ts` converts the DOM to PDF using jsPDF. Triggered from the transaction detail view.

### `analytics/`
- `KPICard` — animates number changes via `AnimatedNumber`
- `RevenueChart`, `TransactionTrendChart` — Recharts `ResponsiveContainer` wrappers
- `EarnRedeemBreakdown` — Recharts Pie chart
- `DateRangeSelector`, `LocationSelector` — filter controls

## Pages Quick Reference

| Route | Purpose | Key hook |
|-------|---------|----------|
| `/` | Dashboard: KPIs + charts | `useMerchantStats`, `useAnalytics` |
| `/customers` | Searchable list | `useMerchantCustomers` |
| `/customers/detail?id=` | Customer profile + tx history | `useCustomer`, `useCustomerTransactions` |
| `/transactions` | Full transaction log | `useMerchantTransactions` |
| `/manual-entry` | Record purchase by phone | `useRecordPurchase` |
| `/redeem` | Point redemption flow | `useRedeemPoints` |
| `/settings` | Profile, locations, perks, wallet branding, push stats | `useMerchant`, `usePerks`, `usePushStats` |
| `/marketing` | Campaign management + push targeting | `useCampaigns` |
| `/signup-complete` | Post-payment status polling (public, no auth guard) | `useSignupStatus` |

## Gotchas

- `ClientDate` wraps date rendering to avoid hydration mismatch (server vs browser locale)
- `AnimatedNumber` uses `useEffect` with RAF — wrap in `<Suspense>` if used in RSC trees
- Receipt PDF generation (`receipt-pdf.ts`) uses `document.getElementById` — must be client-side only
- Phone normalisation: always call `normalizePhone()` (from `@pointly/shared`) before sending to API
- Pagination: API returns `{ data: [...], nextToken: string }` — pass `nextToken` as query param for next page
- `idempotencyKey` on purchases: generate with `crypto.randomUUID()` client-side before calling `purchaseApi.record()`
- Form inputs in Sheets/modals must use `htmlFor`/`id` pairs on label+input — Biome enforces `noLabelWithoutControl` as an error
