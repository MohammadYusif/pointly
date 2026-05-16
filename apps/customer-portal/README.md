# Pointly Customer Portal

Next.js 15 app for end customers. Phone OTP login (Cognito CUSTOM_AUTH), Arabic-first with bilingual support, forced light mode.

See [CLAUDE.md](CLAUDE.md) for the full engineering guide (auth flow, i18n, styling, gotchas).

## Quick Start

```bash
pnpm dev        # next dev on :3001
pnpm build      # next build
pnpm type-check # tsc --noEmit
```

Env vars needed: `NEXT_PUBLIC_CUSTOMER_USER_POOL_ID`, `NEXT_PUBLIC_CUSTOMER_CLIENT_ID`, `NEXT_PUBLIC_API_URL`

## Features

- **Login** — phone number + OTP two-step (no password)
- **Dashboard** — global points balance, tier badge + progress, quick actions
- **QR code** — full-screen animated QR for in-store scanning (auto-refreshes before expiry)
- **Transaction history** — infinite-scroll paginated list
- **Merchant enrollment** — browse and enroll with merchants
- **Profile** — edit name, SMS marketing opt-in toggle
- **Wallet** — download Apple/Google Wallet pass
- **Challenges** — weekly visit streak tracking

## Key Patterns

- Default language: Arabic (`dir="rtl"`) — inline script in `layout.tsx` prevents direction flash
- All data fetching via TanStack Query hooks in `hooks/api/`
- `CustomerLayout` handles the auth guard — don't duplicate in individual pages
- Phone inputs always `dir="ltr"` regardless of page direction
- `completeProfile({})` called on every login (idempotent) to ensure DynamoDB record exists
