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
    terms/page.tsx     # Static terms of service
    privacy/page.tsx   # Static privacy policy
    layout.tsx         # Root layout — RTL/LTR, IBM Plex Sans Arabic, Providers
    providers.tsx      # Context wiring
    globals.css        # Tailwind + component CSS
  components/
    CustomerLayout.tsx # Bottom nav shell + auth guard + session guard
    PerksSection.tsx   # Shows available perks for each enrolled merchant
    PointlyLogo.tsx    # Inline SVG logo (no external asset import needed)
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
On 401, calls `signOut()` and redirects to `/`.

| Function | Endpoint |
|----------|----------|
| `getCustomer()` | GET `/v1/me` |
| `getCustomerTransactions(params)` | GET `/v1/me/transactions` |
| `updateCustomer(data)` | PATCH `/v1/me` |
| `generateQRCode()` | POST `/v1/me/qr-code` |
| `getMyPerks()` | GET `/v1/me/perks` |
| `completeProfile(data)` | POST `/v1/me/setup` |
| `getMyMerchants()` | GET `/v1/me/merchants` |
| `getPublicMerchants()` | GET `/v1/merchants` |
| `enrollMerchant(merchantId)` | POST `/v1/me/enroll` |

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
- **IBM Plex Sans Arabic** — loaded via Google Fonts in `layout.tsx`
- **Light mode forced** — no dark mode classes. `globals.css` has `color-scheme: light` and explicit light backgrounds
- Login page uses CSS classes: `.login-page`, `.login-orb`, `.login-grid`, `.login-hero`, `.login-card` — all defined in `globals.css`
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
| `/terms` | Terms of service (static) | No |
| `/privacy` | Privacy policy (static) | No |

## Gotchas

- Wrong OTP triggers `customChallenge` callback (not `onFailure`) — `confirmOtp` handles this by rejecting with a user-friendly message
- `signUpWithCognito` uses a dummy random password — Cognito requires a password field even for OTP-only pools
- Phone inputs need `dir="ltr"` and placeholder `05XXXXXXXX` — number is stored in E.164 after `normalizePhone()`
- QR codes expire — `generateQRCode()` returns an `expiresAt` timestamp; the QR page should auto-refresh before expiry
- `PointlyLogo` is an inline SVG component (not imported from `@pointly/assets`) — avoids asset pipeline issues in this app
- `CustomerLayout` handles auth guard — do not duplicate auth checks in individual pages
