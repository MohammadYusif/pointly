# API – `apps/api`

Fastify 5 REST API running on AWS Lambda (Node 20). Clean/DDD architecture. Talks to DynamoDB only.

## Commands

```bash
pnpm dev                          # tsx watch (hot-reload local server on port 3000)
pnpm test                         # vitest run --coverage
pnpm test:watch                   # vitest interactive
pnpm build                        # tsc + tsc-alias
pnpm build:lambda:all             # esbuild → 3 Lambda zips (main, decay, tier-reset)
pnpm type-check                   # tsc --noEmit

# From monorepo root
pnpm docker:up                    # Start local DynamoDB (docker compose)
pnpm seed                         # Seed test data
pnpm seed:clean                   # Wipe + reseed
```

## Architecture

```
src/
  domain/           # Pure business logic — no I/O, no framework
    config/         # TierConfig.ts — SINGLE SOURCE OF TRUTH for tiers
    entities/       # Customer, Merchant, Transaction (rich domain objects)
    value-objects/  # Points, Money, Email, PhoneNumber, CustomerTier
    errors/         # DomainError, ValidationError, NotFoundError
  application/
    use-cases/      # One class per operation (RecordPurchaseUseCase, etc.)
    repositories/   # Interfaces (ICustomerRepository, etc.)
    services/       # Interfaces (IDecayCalculatorService, ISmsPublisherService)
  infrastructure/
    config/         # Environment.ts — Zod-validated env vars
    database/       # DynamoDBClient factory
    repositories/   # DynamoDB implementations
    services/       # DecayCalculatorService, SmsPublisherService, TransactionalWriter
  presentation/
    http/
      container.ts  # DI container — wires repos → services → use-cases
      routes/       # Route handlers (thin — delegate to use-cases)
      plugins/      # cognitoAuth, cognitoCustomerAuth, errorHandler
  lambda.ts           # Main Lambda entrypoint (API Gateway proxy)
  scheduled-decay.ts  # EventBridge cron — monthly point decay
  scheduled-tier-reset.ts  # EventBridge cron — monthly tier reset
```

## Route Map

All routes under `/v1`. Auth scopes are applied at the registration level, not per-route.

**Public routes:**
| Method | Path | Handler file |
|--------|------|--------------|
| GET | `/health` | `routes/health.ts` |
| POST | `/v1/customers` | `routes/customerPublic.ts` |
| GET | `/v1/customers/phone/:phone` | `routes/customerPublic.ts` |
| GET | `/v1/merchants/:id/public` | `routes/merchantPublic.ts` |
| GET | `/v1/push/vapid-key` | `routes/push.ts` |

**Customer JWT routes (`/v1/me/...`):**
| Method | Path | Handler file |
|--------|------|--------------|
| GET | `/v1/me` | `routes/customerSelf.ts` |
| PATCH | `/v1/me` | `routes/customerSelf.ts` |
| DELETE | `/v1/me` | `routes/customerSelf.ts` |
| POST | `/v1/me/setup` | `routes/customerSelf.ts` |
| POST | `/v1/me/qr-code` | `routes/customerSelf.ts` |
| GET | `/v1/me/transactions` | `routes/customerSelf.ts` |
| GET | `/v1/me/perks` | `routes/customerSelf.ts` |
| GET | `/v1/me/merchants` | `routes/customerSelf.ts` |
| POST | `/v1/me/enroll` | `routes/customerSelf.ts` |
| GET | `/v1/me/challenges` | `routes/customerSelf.ts` |
| POST | `/v1/me/gift` | `routes/customerSelf.ts` |
| POST | `/v1/me/consent/:merchantId` | `routes/customerSelf.ts` |
| POST | `/v1/me/push-subscriptions` | `routes/push.ts` |
| DELETE | `/v1/me/push-subscriptions` | `routes/push.ts` |
| GET | `/v1/me/wallet/apple-pass` | `routes/wallet-pass.ts` |
| GET | `/v1/me/wallet/google-link` | `routes/wallet-pass.ts` |

**Merchant JWT routes:**
| Method | Path | Handler file |
|--------|------|--------------|
| GET | `/v1/merchants/:id` | `routes/merchants.ts` |
| PATCH | `/v1/merchants/:id` | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/logo-upload` | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/locations` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/customers` | `routes/customers.ts` |
| GET | `/v1/merchants/:id/transactions` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/stats` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/analytics` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/analytics/locations/:locationId` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/customer-insights` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/perk-insights` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/customers/tier-breakdown` | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/register-customer` | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/enroll-customer` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/verify-qr` | `routes/merchants.ts` |
| GET | `/v1/merchants/:id/push-stats` | `routes/push.ts` |
| POST/PATCH/DELETE | `/v1/merchants/:id/perks` | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/campaigns` | `routes/campaigns.ts` |
| GET/PATCH/DELETE | `/v1/merchants/:id/campaigns/:campaignId` | `routes/campaigns.ts` |
| POST | `/v1/merchants/:id/webhooks` | `routes/webhooks.ts` |
| GET | `/v1/merchants/:id/webhooks` | `routes/webhooks.ts` |
| DELETE | `/v1/merchants/:id/webhooks/:webhookId` | `routes/webhooks.ts` |
| POST | `/v1/purchases` | `routes/purchases.ts` |
| POST | `/v1/purchases/redeem` | `routes/purchases.ts` |
| GET | `/v1/purchases/:id` | `routes/purchases.ts` |
| GET | `/v1/customers/:id` | `routes/customers.ts` |
| GET | `/v1/customers/:id/transactions` | `routes/customers.ts` |
| GET | `/v1/customers/:id/stats` | `routes/customers.ts` |

## Use Cases

All live in `application/use-cases/`. Each has a single `execute()` method.

| Use Case | Triggered by |
|----------|-------------|
| `EnrollCustomerUseCase` | POST `/v1/merchants/:id/register-customer` |
| `ApproveConsentUseCase` | POST `/v1/me/consent/:merchantId` |
| `RecordPurchaseUseCase` | POST `/v1/purchases` |
| `RedeemPointsUseCase` | POST `/v1/purchases/redeem` |
| `GenerateQRCodeUseCase` | POST `/v1/me/qr-code` |
| `ManagePerkUseCase` | POST/PATCH/DELETE `/v1/merchants/:id/perks` |
| `ManageCampaignUseCase` | POST/PATCH/DELETE `/v1/merchants/:id/campaigns` |
| `GetAnalyticsUseCase` | GET `/v1/merchants/:id/analytics` |
| `GetCustomerPerksUseCase` | GET `/v1/me/perks` |
| `GetCustomerInsightsUseCase` | GET `/v1/merchants/:id/customer-insights` |
| `ManagePushSubscriptionUseCase` | POST/DELETE `/v1/me/push-subscriptions`, GET `/v1/push/vapid-key`, GET `/v1/merchants/:id/push-stats` |
| `ManageWalletPassUseCase` | GET `/v1/me/wallet/apple-pass`, GET `/v1/me/wallet/google-link` |
| `CheckChallengeEligibilityUseCase` | GET `/v1/me/challenges` |
| `ProcessPointsDecayUseCase` | `scheduled-decay.ts` (EventBridge monthly) |
| `ProcessMonthlyTierResetUseCase` | `scheduled-tier-reset.ts` (EventBridge monthly) |

## DI Container (`container.ts`)

`getContainer()` returns a singleton. `resetContainer()` clears it (used in tests).
All repos and use-cases are instantiated here — never `new` them in route handlers.

## Environment Variables

Validated at startup by Zod (`infrastructure/config/Environment.ts`). Required:

```
USER_LEDGER_TABLE       # DynamoDB: customers + merchants (same table, PK differentiates)
TRANSACTION_TABLE
IDEMPOTENCY_TABLE
QR_NONCE_TABLE
PENDING_CONSENTS_TABLE  # defaults to 'pointly-pending-consents' if absent
SMS_QUOTA_TABLE
SMS_QUEUE_URL           # SQS queue for SMS dispatch
WALLET_PASSES_TABLE     # DynamoDB: push subscriptions + wallet pass data (defaults to 'pointly-wallet-passes')

# Optional (Cognito — required in production)
MERCHANT_USER_POOL_ID
MERCHANT_USER_POOL_CLIENT_ID
CUSTOMER_USER_POOL_ID
CUSTOMER_USER_POOL_CLIENT_ID

# Optional — Web Push (VAPID)
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT           # e.g. mailto:admin@pointly.sa

# Optional — Apple Wallet (all required together if Apple pass enabled)
APPLE_PASS_CERT_PEM
APPLE_PASS_KEY_PEM
APPLE_PASS_KEY_PASSPHRASE
APPLE_TEAM_ID
APPLE_PASS_TYPE_ID
APPLE_WWDR_PEM

# Optional — Google Wallet
GOOGLE_WALLET_ISSUER_ID
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
GOOGLE_WALLET_PRIVATE_KEY

# Optional — S3 merchant logo assets
MERCHANT_ASSETS_BUCKET
MERCHANT_ASSETS_URL     # CloudFront URL prefix for serving logo assets

# Local dev
DYNAMODB_ENDPOINT       # e.g. http://localhost:8000 (set by docker-compose)
```

## Auth

Two separate Cognito pools. Two plugins, two `preHandler` hooks.

- **Merchant**: `plugins/cognitoAuth.ts` → `verifyMerchantToken` — validates JWT, injects `request.merchant`
- **Customer**: `plugins/cognitoCustomerAuth.ts` → `verifyCustomerToken` — validates JWT, injects `request.customer`
- API uses **ID token** (not access token) — custom attributes like `custom:merchantId` are in the ID token payload.

## Customer Domain (key rules)

- **Dual wallet**: `globalPointsBalance` (spendable anywhere) + per-merchant `merchantPointsBalance`
- **Tier upgrades**: happen immediately when `monthlyProgress` crosses a threshold during `addPointsFromPurchase`
- **Tier decay**: happens once per month via scheduled job — drops ONE level if threshold not maintained
- **Smart redemption** (`redeemSmart`): prioritises merchant points first, then global points
- **Point decay**: 12-month grace → Phase 1: 5%/month (months 12-17) → Phase 2: 15%/month + wipe merchant points (month 18+)
- **Decay immunity**: Gold/Platinum/Diamond tiers are decay-immune for global points; Phase 2 wipes merchant balances for all tiers
- **Lazy monthly reset**: `addPointsFromPurchase` checks `isNewMonth()` and resets `monthlyProgress` if cron missed a run

## Testing

Tests live in `src/**/__tests__/`. Run `pnpm test`. Coverage via `@vitest/coverage-v8`.

Key test files:
- `application/__tests__/RecordPurchaseUseCase.test.ts`
- `application/__tests__/RedeemPointsUseCase.test.ts`
- `domain/__tests__/tier.test.ts`
- `domain/__tests__/point-system.test.ts`

## Lambda Build

Three separate esbuild bundles (no shared code at runtime):
- `dist/lambda/index.js` — API Gateway handler
- `dist/lambda-decay/index.js` — Decay cron
- `dist/lambda-tier-reset/index.js` — Tier reset cron

**Always rebuild before `terraform apply`** when API code changes.

## Gotchas

- `TransactionalWriter.writeAll()` is used for ALL multi-entity writes — never write repos individually in a use-case if multiple entities change
- Idempotency check happens inside `RecordPurchaseUseCase` and `RedeemPointsUseCase` — always pass a client-generated `idempotencyKey`
- `getContainer()` is a singleton per Lambda warm instance — `resetContainer()` in tests to avoid state leakage
- Phone numbers stored in E.164 format (`+966XXXXXXXXX`) — use `normalizePhone()` from `@pointly/shared` before lookup
- DynamoDB `USER_LEDGER_TABLE` holds both Customers and Merchants — PK prefix differentiates (`CUSTOMER#` vs `MERCHANT#`)
- `@pointly/api` does NOT depend on `@pointly/shared` — domain types (`PerkType`, `WalletConfig`, `CampaignType`, etc.) are intentionally local to keep the Lambda bundle self-contained
- `WALLET_PASSES_TABLE` stores both push subscription records (`PK: CUSTOMER#<id> SK: PUSH#<hash>`) and merchant-keyed push index records (`PK: MERCHANT_PUSH#<merchantId> SK: CUSTOMER#<id>#PUSH#<hash>`) — do not use `ScanCommand` for per-merchant queries; use `QueryCommand` on the merchant-keyed PK
- Apple/Google Wallet generation returns a 501 gracefully if the relevant env vars are absent — no crash
