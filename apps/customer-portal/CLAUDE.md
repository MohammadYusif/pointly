# Customer Portal – `apps/customer-portal`

Next.js 15, phone OTP login (Cognito CUSTOM_AUTH), Arabic-first bilingual, forced light mode. Customers view points, tier, QR code, transaction history, enrolled merchants.

## Commands

```bash
pnpm dev          # next dev, port 3001
pnpm build        # next build
pnpm type-check   # tsc --noEmit
pnpm lint         # biome check
```

## Directory Structure

```
src/
  app/
    page.tsx           # Login — phone → OTP two-step
    register/page.tsx  # New customer signup
    dashboard/page.tsx # Points, tier, quick actions
    qr/page.tsx        # Animated QR (auto-refresh before expiry)
    history/page.tsx   # Paginated transaction history
    enroll/page.tsx    # Browse & enroll with merchants
    profile/page.tsx   # Edit name, view enrollments
    wallet/page.tsx    # Apple/Google Wallet pass download
    terms/ privacy/    # Static pages
    layout.tsx         # Root layout — RTL/LTR, IBM Plex Sans Arabic, Providers
  components/
    CustomerLayout.tsx  # Bottom nav + auth guard + session guard
    PerksSection.tsx
    PointlyLogo.tsx     # Inline SVG logo
  hooks/api/            # TanStack Query hooks — all data fetching goes here
    use-customer.ts, use-merchants.ts, use-transactions.ts,
    use-perks.ts, use-qr.ts, use-challenges.ts,
    use-notifications.ts, use-tier-benefits.ts, use-delete-account.ts
  lib/
    auth.ts   # Cognito OTP helpers
    api.ts    # All API calls (/v1/me/* routes)
```

## Auth Flow

Phone-only OTP via Cognito `CUSTOM_AUTH`. No password.

- `signInWithPhone(phone, rememberMe)` → initiates CUSTOM_AUTH
- `confirmOtp(user, code)` → `sendCustomChallengeAnswer`
- `rememberMe=true` (default) → `localStorage`; `false` → `sessionStorage`
- `completeProfile({})` called after OTP — idempotent, ensures DynamoDB record exists
- `CustomerLayout` handles session guard: `null` session → redirect `/?expired=1`
- `signUpWithCognito` uses a dummy password — Cognito requires it even for OTP-only pools

Env vars: `NEXT_PUBLIC_CUSTOMER_USER_POOL_ID`, `NEXT_PUBLIC_CUSTOMER_CLIENT_ID`, `NEXT_PUBLIC_API_URL`

## API Layer (`lib/api.ts`)

All routes are customer-scoped (`/v1/me/*`). Attaches ID token as `Authorization: Bearer`. On 401 → `signOut()` + redirect `/?expired=1`.

Key functions: `getCustomer`, `updateCustomer`, `deleteAccount`, `generateQRCode`, `getMyPerks`, `getMyChallenges`, `getMyMerchants`, `enrollMerchant`, `completeProfile`, `giftPoints`, `pushApi.*`, `walletApi.*`.

Never call `lib/api.ts` directly from components — always through `hooks/api/`.

## i18n & RTL

- Default: Arabic (`lang="ar"`, `dir="rtl"`)
- Language stored in `localStorage['pointly-language']`
- Inline script in `layout.tsx` reads storage before hydration (prevents direction flash)
- `useTranslation()` from `@pointly/i18n`, `useRTL()` from `@pointly/ui`
- Phone inputs always `dir="ltr"` regardless of page direction

## Styling

- **Tailwind v4** — theme tokens in `globals.css`, no config file
- **Light mode forced** — `color-scheme: light`, no dark mode classes
- **Body background**: 4-layer gradient (teal + navy glows, dot grid, base `#f9fafb`) — do not add a bg wrapper div
- **Glow orbs**: `.portal-orb.portal-orb-teal/navy/orange` with `orbDrift` keyframe, rendered by `CustomerLayout`
- **Card glassmorphism**: `rgba(255,255,255,0.85) + blur(12px)` via `[data-slot="card"]` global selector
- **Frosted header**: `.portal-header` — `blur(20px) saturate(1.5)`

## Pages

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | No | Phone → OTP login |
| `/register` | No | New user signup |
| `/dashboard` | Yes | Points, tier, QR shortcut, perks |
| `/qr` | Yes | Full-screen QR for merchant scanning |
| `/history` | Yes | Paginated transactions |
| `/enroll` | Yes | Browse + enroll merchants |
| `/profile` | Yes | Edit name, SMS opt-in, merchant enrollments |
| `/wallet` | Yes | Download Apple/Google Wallet pass |

## Gotchas

- Wrong OTP triggers `customChallenge` callback (not `onFailure`) — `confirmOtp` rejects with a user-friendly message
- QR codes expire — use `expiresAt` from `generateQRCode()` to auto-refresh before expiry
- `PointlyLogo` inline SVG: counter fills (`P` bowl, `o` hole) must match the background — `fill="transparent"` is a no-op; use `counterFill` prop derived from `color` prop
- `Dashboard/page.tsx` calls both `getCustomer()` and `getMyMerchants()` — `CustomerEnrollment` lacks `businessName` so the extra call is intentional
- `CustomerLayout` is the auth guard — don't duplicate auth checks in individual pages
- `smsMarketingOptIn` is on the `/profile` page — toggle sends `PATCH /v1/me`
