# Customer Portal – `apps/customer-portal`

Next.js 15 app for end customers. Phone-number login (OTP via Cognito CUSTOM_AUTH flow), Arabic-first with bilingual support, forced light mode. Customers view points, tier, QR code, transaction history, and enrolled merchants.

## Commands

```bash
pnpm dev              # next dev on port 3001
pnpm build            # next build
pnpm type-check       # tsc --noEmit
pnpm lint             # biome check
```

## Directory Structure

```
src/
  app/
    page.tsx           # Login page — phone → OTP two-step form
    register/page.tsx  # New customer signup (phone + name)
    dashboard/page.tsx # Main screen: points, tier, quick actions
    qr/page.tsx        # Animated QR code (auto-refreshes)
    history/page.tsx   # Transaction history with pagination
    enroll/page.tsx    # Browse & enroll with merchants
    profile/page.tsx   # Edit name, view enrolled merchants
    wallet/page.tsx    # Apple/Google wallet pass download
    terms/page.tsx     # Static terms of service
    privacy/page.tsx   # Static privacy policy
    layout.tsx         # Root layout — RTL/LTR, IBM Plex Sans Arabic, Providers
    providers.tsx      # Context wiring
    globals.css        # Tailwind + component CSS
  components/
    CustomerLayout.tsx # Bottom nav shell + auth guard + session guard
    PerksSection.tsx   # Shows available perks for each enrolled merchant
    PointlyLogo.tsx    # Inline SVG logo (no external asset import needed)
  hooks/api/           # TanStack Query hooks — all data fetching goes through here
    use-challenges.ts  # useGetChallenges()
    use-customer.ts    # useGetCustomer(), useUpdateCustomer()
    use-delete-account.ts # useDeleteAccount()
    use-gift.ts        # useGiftPoints()
    use-merchants.ts   # useGetMyMerchants(), useGetPublicMerchants(), useEnrollMerchant()
    use-notifications.ts # usePushNotifications() — VAPID key + subscription management
    use-perks.ts       # useGetMyPerks()
    use-qr.ts          # useGenerateQRCode()
    use-transactions.ts # useGetMyTransactions()
  lib/
    auth.ts            # Cognito OTP helpers
    api.ts             # All API calls (customer-scoped /v1/me/* routes)
```

## Auth Flow

Phone-only OTP via Cognito `CUSTOM_AUTH` flow. No password.

```
lib/auth.ts
  signInWithPhone(phone, rememberMe)  → initiates CUSTOM_AUTH, returns CognitoUser
  confirmOtp(user, code)              → sendCustomChallengeAnswer
  getCurrentSession()                 → returns ID token JWT string, or null
  getAccessToken()                    → alias for getCurrentSession()
  signOut()                           → clears all storages (localStorage, sessionStorage, library default)
  signUpWithCognito(phone, name?)     → pool.signUp with dummy password (required by Cognito even for OTP flows)
```

### Remember Me Storage Strategy

- `rememberMe=true` (default): Cognito library uses its default `StorageHelper` → `localStorage` (persists across tabs/restarts)
- `rememberMe=false`: pass `window.sessionStorage` explicitly → cleared on tab close
- A `pointly-auth-storage` key in `sessionStorage` tracks which storage was used
- `getCurrentSession()` tries storages in priority order to avoid missing old sessions

### Session Guard

`CustomerLayout.tsx` calls `getCurrentSession()` on mount. If `null`, redirects to `/?expired=1`. The `?expired=1` param prevents an infinite redirect loop on the login page (login page skips the "already authenticated" redirect when this param is set).

### Login → Profile Setup

After OTP confirmation, `completeProfile({})` is always called (idempotent) to ensure the DynamoDB customer record exists. This is safe to call on every login.

### Env Vars

```
NEXT_PUBLIC_CUSTOMER_USER_POOL_ID
NEXT_PUBLIC_CUSTOMER_CLIENT_ID
NEXT_PUBLIC_API_URL          # e.g. https://api.pointly.sa
```

## API Layer (`lib/api.ts`)

All routes are **customer-scoped** (`/v1/me/*`). Attaches ID token as `Authorization: Bearer`.
On 401, calls `signOut()` and redirects to `/?expired=1` (`window.location.replace`). The `?expired=1` param prevents the login page from auto-redirecting authenticated users back to dashboard, breaking the loop.

| Function | Endpoint |
|----------|----------|
| `getCustomer()` | GET `/v1/me` |
| `getCustomerTransactions(params)` | GET `/v1/me/transactions` |
| `updateCustomer(data)` | PATCH `/v1/me` |
| `deleteAccount()` | DELETE `/v1/me` |
| `generateQRCode()` | POST `/v1/me/qr-code` |
| `getMyPerks()` | GET `/v1/me/perks` |
| `getMyChallenges()` | GET `/v1/me/challenges` |
| `giftPoints(data)` | POST `/v1/me/gift` |
| `completeProfile(data)` | POST `/v1/me/setup` |
| `getMyMerchants()` | GET `/v1/me/merchants` |
| `getPublicMerchants()` | GET `/v1/merchants` |
| `enrollMerchant(merchantId)` | POST `/v1/me/enroll` |
| `pushApi.getVapidKey()` | GET `/v1/push/vapid-key` |
| `pushApi.subscribe(sub)` | POST `/v1/me/push-subscriptions` |
| `pushApi.unsubscribe()` | DELETE `/v1/me/push-subscriptions` |
| `walletApi.getApplePass()` | GET `/v1/me/wallet/apple-pass` |
| `walletApi.getGoogleLink()` | GET `/v1/me/wallet/google-link` |

## i18n & RTL

- **Default language**: Arabic (`lang="ar"`, `dir="rtl"`)
- Language stored in `localStorage` under key `pointly-language` (`'ar'` | `'en'`)
- Inline script in `layout.tsx` reads storage before hydration to prevent flash of wrong direction
- `useTranslation()` from `@pointly/i18n` — returns `{ t, language, setLanguage }`
- `useRTL()` from `@pointly/ui` — returns `{ isRTL, textStart, textEnd, flexRow, flexRowReverse }`
- `<LanguageToggle />` from `@pointly/ui` toggles language + updates `document.documentElement.dir/lang`
- Phone inputs should always have `dir="ltr"` regardless of page direction

## Styling

- **Tailwind CSS v4** — no `tailwind.config.js`, theme tokens in `globals.css`
- **Fonts**: `Plus Jakarta Sans` (English) + `IBM Plex Sans Arabic` (Arabic) — both loaded via Google Fonts in `layout.tsx`. RTL pages use Arabic font via `html[dir="rtl"]` override in `globals.css`
- **Light mode forced** — no dark mode classes. `globals.css` has `color-scheme: light` and explicit light backgrounds
- **Body background** — 4-layer gradient: teal glow + navy glow + 26 px dot grid + base `#f9fafb→#f1f3f5`, `background-attachment: fixed`. Matches landing page — **do not add a background wrapper div**
- **Glow orbs** — three fixed-position blurred circles rendered by `CustomerLayout.tsx` as `.portal-orb.portal-orb-teal/navy/orange` with `orbDrift` keyframe animation. Add/adjust in `globals.css`
- **Card glassmorphism** — `rgba(255,255,255,0.85)` + `blur(12px)` via `[data-slot="card"]` global selector in `globals.css`
- **Frosted header** — `.portal-header` uses `blur(20px) saturate(1.5)` in `globals.css`
- **Login page classes**: `.login-page`, `.login-orb`, `.login-grid`, `.login-hero`, `.login-card` — all in `globals.css`
- `CustomerLayout` wraps all authenticated pages with bottom navigation bar

## Pages Quick Reference

| Route | Purpose | Auth required |
|-------|---------|---------------|
| `/` | Phone → OTP login | No |
| `/register` | New user signup | No |
| `/dashboard` | Points, tier badge, QR shortcut, perks | Yes |
| `/qr` | Full-screen QR code for merchant scanning | Yes |
| `/history` | Paginated transaction list | Yes |
| `/enroll` | Browse merchants + enroll | Yes |
| `/profile` | Edit name, view merchant enrollments | Yes |
| `/wallet` | Download Apple/Google Wallet pass | Yes |
| `/terms` | Terms of service (static) | No |
| `/privacy` | Privacy policy (static) | No |

## Gotchas

- Wrong OTP triggers `customChallenge` callback (not `onFailure`) — `confirmOtp` handles this by rejecting with a user-friendly message
- `signUpWithCognito` uses a dummy random password — Cognito requires a password field even for OTP-only pools
- Phone inputs need `dir="ltr"` and placeholder `05XXXXXXXX` — number is stored in E.164 after `normalizePhone()`
- QR codes expire — `generateQRCode()` returns an `expiresAt` timestamp; the QR page should auto-refresh before expiry
- `PointlyLogo` is an inline SVG — counter fills (`P` bowl, `o` hole) must **match the background**: dark text → `#f9fafb` counter (light bg); white text → `#141e33` counter (dark login bg). `fill="transparent"` is a no-op in SVG; the component uses a `counterFill` variable derived from the `color` prop
- Dashboard `page.tsx` calls both `getCustomer()` and `getMyMerchants()` to build a `merchantId → businessName` lookup — `CustomerEnrollment` type lacks `businessName`, so the extra call is intentional
- `CustomerLayout` handles auth guard — do not duplicate auth checks in individual pages
