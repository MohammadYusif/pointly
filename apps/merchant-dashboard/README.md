# Pointly Merchant Dashboard

Next.js 15 admin panel for merchants. Email/password login (Cognito), manage customers, record purchases, redeem points, view analytics and campaigns.

See [CLAUDE.md](CLAUDE.md) for the full engineering guide (auth flow, API layer, styling, gotchas).

## Quick Start

```bash
pnpm dev        # next dev on :3000
pnpm build      # next build
pnpm type-check # tsc --noEmit
```

Env vars needed: `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_API_URL`

## Features

- **Dashboard** — KPI cards (revenue, transactions, customers) + Recharts analytics
- **Customers** — searchable list, detail view with transaction history, CSV export
- **Transactions** — full log with filters
- **Manual entry** — record purchase by phone number
- **Redemptions** — point redemption flow with smart merchant-first logic
- **Settings** — business profile, locations, perks, wallet card branding, push stats
- **Marketing** — campaign management (welcome, win-back, tier-based) + push notification targeting
- **Signup flow** — post-Moyasar payment status polling (public page, no auth)

## Key Patterns

- All data fetching via TanStack Query hooks in `hooks/api/` — never call `lib/api.ts` from components
- `idempotencyKey` for purchases: `crypto.randomUUID()` client-side
- Phone inputs: always run `normalizePhone()` from `@pointly/shared` before sending to API
- Sends the **ID token** (not access token) — `getAccessToken()` in `lib/auth.ts` returns it
