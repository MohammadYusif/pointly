# Site Audit Fixes

## Problem

A browser audit of staging (2026-06-12) found:

1. Landing inner pages (`/privacy`, `/terms`, `/contact`, `/help`, `/blog`,
   `/careers`) served the home page — landing CloudFront had no URL-rewrite
   function, and pages export as `privacy.html` (no trailing slash).
2. Portal merchant detail pages unreachable — `/merchants/[id]` exported a
   placeholder param only; the 404→index.html fallback redirected to
   `/dashboard` and poisoned RSC prefetches.
3. Portal dashboard streak card rendered "undefined / 3" — API returns
   `{ weeklyStreakChallenge: { current, ... } }` but the shared type and the
   dashboard expected `weeklyVisitCount`.
4. Wallet page priced merchant points with the global default redemption rate
   instead of each merchant's configured rate, and showed a SAR value on
   global points (which are not redeemable).
5. React hydration error #418 on landing — locale read from localStorage in
   the `useState` initializer diverged from the SSG HTML.
6. Copy: false "free trial / no credit card" claims; Billing page advertised
   non-existent plan features; garbled Settings loyalty labels; premature
   "Location is required" error on manual-entry; auth chrome flash before
   login redirect.
7. Staging DynamoDB still carried pre-change loyalty config (0.01 rate,
   min purchase, welcome bonus) — data is never touched by deploys.

## Decisions

- Landing gets its own CloudFront viewer-request rewrite (strip trailing
  slash + append `.html`), mirroring the portal/dashboard pattern.
- Merchant detail moves to a query-param route `/merchants/detail/?id=` —
  same pattern as the dashboard's `/customers/detail/?id=` — instead of
  relying on CloudFront fallbacks for dynamic segments.
- The API response is the source of truth for the streak shape; the shared
  type and portal were updated to match (`weeklyStreakChallenge.current`).
- `/v1/me/merchants` now returns each merchant's `redemptionRate`; the wallet
  uses it per store card. Global points no longer display a SAR value.
- Landing locale initializes to `ar` and syncs from localStorage in an
  effect (kills hydration mismatch; the pre-hydration head script still
  prevents direction flash).
- Marketing copy no longer promises a free trial; billing plan features
  mirror the landing plan bullets (locations / SMS quota / network access).
- Staging re-seeded via `node scripts/seed-data.mjs --env dev --clean`
  (deterministic `*_seed` items only).

## Constraints

- All three frontends are static exports — no middleware, no server routing.
- Dynamic route segments cannot be used for unknown IDs; use query params.
- CloudFront functions cannot check S3 object existence — rewrites are
  purely syntactic.
