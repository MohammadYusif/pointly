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

| Method | Path | Auth | Handler file |
|--------|------|------|--------------|
| GET | `/health` | Public | `routes/health.ts` |
| POST | `/v1/customers` | Public | `routes/customerPublic.ts` |
| GET | `/v1/customers/phone/:phone` | Public | `routes/customerPublic.ts` |
| GET | `/v1/merchants/:id/public` | Public | `routes/merchantPublic.ts` |
| GET | `/v1/me` | Customer JWT | `routes/customerSelf.ts` |
| GET | `/v1/me/transactions` | Customer JWT | `routes/customerSelf.ts` |
| GET | `/v1/me/qr` | Customer JWT | `routes/customerSelf.ts` |
| POST | `/v1/purchases` | Merchant JWT | `routes/purchases.ts` |
| POST | `/v1/purchases/redeem` | Merchant JWT | `routes/purchases.ts` |
| GET | `/v1/customers/:id` | Merchant JWT | `routes/customers.ts` |
| GET | `/v1/merchants/:id/customers` | Merchant JWT | `routes/customers.ts` |
| GET | `/v1/merchants/:id/analytics` | Merchant JWT | `routes/merchants.ts` |
| PATCH | `/v1/merchants/:id` | Merchant JWT | `routes/merchants.ts` |
| POST | `/v1/merchants/:id/perks` | Merchant JWT | `routes/merchants.ts` |

## Use Cases

All live in `application/use-cases/`. Each has a single `execute()` method.

| Use Case | Triggered by |
|----------|-------------|
| `EnrollCustomerUseCase` | POST `/v1/merchants/:id/register-customer` |
| `ApproveConsentUseCase` | POST `/v1/me/consent/:merchantId` |
| `RecordPurchaseUseCase` | POST `/v1/purchases` |
| `RedeemPointsUseCase` | POST `/v1/purchases/redeem` |
| `GenerateQRCodeUseCase` | GET `/v1/me/qr` |
| `ManagePerkUseCase` | POST/PATCH/DELETE `/v1/merchants/:id/perks` |
| `GetAnalyticsUseCase` | GET `/v1/merchants/:id/analytics` |
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
PENDING_CONSENTS_TABLE
SMS_QUOTA_TABLE
SMS_QUEUE_URL           # SQS queue for SMS dispatch

# Optional (Cognito — required in production)
MERCHANT_USER_POOL_ID
MERCHANT_USER_POOL_CLIENT_ID
CUSTOMER_USER_POOL_ID
CUSTOMER_USER_POOL_CLIENT_ID

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
