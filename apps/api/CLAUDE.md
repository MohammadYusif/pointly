# API – `apps/api`

Fastify 5 REST API on AWS Lambda (Node 22). Clean/DDD architecture. DynamoDB only.

## Commands

```bash
pnpm dev                    # tsx watch, port 3000
pnpm test                   # vitest --coverage
pnpm build:lambda:all       # esbuild → 4 Lambda zips
pnpm type-check             # tsc --noEmit
pnpm docker:up && pnpm seed # local DynamoDB + seed data
```

## Architecture

```
src/
  domain/           # Pure business logic — no I/O
    config/         # TierConfig.ts — tier thresholds (source of truth)
    entities/       # Customer, Merchant, Transaction
    value-objects/  # Points, Money, Email, PhoneNumber, CustomerTier
    errors/         # DomainError, ValidationError, NotFoundError
  application/
    use-cases/      # One class per operation, single execute() method
    repositories/   # Interfaces
    services/       # Interfaces (IDecayCalculatorService, ISmsPublisherService)
  infrastructure/
    config/         # Environment.ts — Zod-validated env vars
    repositories/   # DynamoDB implementations
    services/       # DecayCalculatorService, SmsPublisherService, TransactionalWriter
  presentation/http/
    container.ts    # DI singleton — wires repos → services → use-cases
    routes/         # Thin handlers, delegate to use-cases
    plugins/        # cognitoAuth, cognitoCustomerAuth, errorHandler
  lambda.ts                  # API Gateway entrypoint
  scheduled-decay.ts         # EventBridge monthly decay cron
  scheduled-tier-reset.ts    # EventBridge monthly tier-reset cron
```

## Routes

All under `/v1`. See `src/presentation/http/routes/` for full handlers.

**Public**: `GET /health`, `POST /v1/customers`, `GET /v1/customers/phone/:phone`, `GET /v1/merchants/:id/public`, `POST /v1/merchants/initiate-signup`, `GET /v1/merchants/signup-status`, `POST /v1/webhooks/moyasar`, `GET /v1/push/vapid-key`

**Customer JWT (`/v1/me/...`)**: self CRUD, QR code, transactions, perks, merchants, enroll, gift, consent, push subscriptions, wallet pass

**Merchant JWT**: merchant CRUD + logo, locations, customers, transactions, stats, analytics, insights, tier breakdown, perks, campaigns, webhooks, purchases, redeem

## Use Cases (`application/use-cases/`)

Key ones: `RecordPurchaseUseCase`, `RedeemPointsUseCase`, `EnrollCustomerUseCase`, `ManagePerkUseCase`, `ManageCampaignUseCase`, `GetAnalyticsUseCase`, `ProcessPointsDecayUseCase`, `ProcessMonthlyTierResetUseCase`, `InitiateMerchantSignupUseCase`, `CompleteMerchantSignupUseCase`.

## DI Container

`getContainer()` — singleton per Lambda warm instance. `resetContainer()` in tests to prevent state leakage. Never `new` repos or use-cases in route handlers.

## Environment Variables

Required at startup (Zod-validated in `Environment.ts`):
```
USER_LEDGER_TABLE, TRANSACTION_TABLE, IDEMPOTENCY_TABLE, QR_NONCE_TABLE,
PENDING_CONSENTS_TABLE, SMS_QUOTA_TABLE, SMS_QUEUE_URL, WALLET_PASSES_TABLE,
MOYASAR_SECRET_KEY, MOYASAR_WEBHOOK_SECRET
```
Optional: Cognito pool IDs, VAPID keys, Apple/Google Wallet certs, S3 assets bucket, `DYNAMODB_ENDPOINT` (local dev).

## Auth

Two Cognito pools, two plugins:
- **Merchant**: `plugins/cognitoAuth.ts` → injects `request.merchant`
- **Customer**: `plugins/cognitoCustomerAuth.ts` → injects `request.customer`
- Uses **ID token** (not access token) — `custom:merchantId` is in the ID token payload.

## Customer Domain Rules

- **Dual wallet**: `globalPointsBalance` (spendable anywhere) + per-merchant `merchantPointsBalance`
- **Tier upgrades**: immediate when `monthlyProgress` crosses threshold in `addPointsFromPurchase`
- **Smart redemption**: prioritises merchant points first, then global
- **Point decay**: 12-month grace → 5%/month (months 12–17) → 15%/month + wipe merchant points (18+)
- **Decay immunity**: Gold/Platinum/Diamond immune for global points; Phase 2 wipes merchant balances for all tiers
- **Lazy monthly reset**: `addPointsFromPurchase` resets `monthlyProgress` via `isNewMonth()` if cron missed

## Lambda Build

Four esbuild bundles (no shared code at runtime): `lambda/` (API GW), `lambda-decay/`, `lambda-tier-reset/`, `lambda-sms-consumer/` (SQS → Taqnyat).

**Always rebuild before `terraform apply`** when API code changes.

## Gotchas

- `TransactionalWriter.writeAll()` for ALL multi-entity writes — never write repos individually in a use-case
- Idempotency is inside `RecordPurchaseUseCase` / `RedeemPointsUseCase` — always pass `idempotencyKey`
- Phone: use `new PhoneNumber(raw).toE164()` in API, NOT `normalizePhone()` (that's frontend-only)
- Merchant gift must only award `merchantPointsBalance` — never `globalPointsBalance`
- Optional fields require `?: T | undefined` — `exactOptionalPropertyTypes` is enabled
- `USER_LEDGER_TABLE` holds Customers (`CUSTOMER#`) and Merchants (`MERCHANT#`) in the same table
- `PendingMerchantSignup` is also in `USER_LEDGER_TABLE`: `PK=PENDING_SIGNUP#<id>`, payment reverse-lookup `PK=PAYMENT_INDEX#<paymentId>` — both 24h TTL
- `IIdempotencyService`: `getResult<T>`, `storeResult<T>`, `delete` — NOT `check`/`record`
- `@pointly/api` does NOT depend on `@pointly/shared` — domain types are local to keep Lambda bundle lean
- Moyasar webhook captures raw body via `addContentTypeParser` for HMAC — any middleware consuming the body stream before this breaks signature verification
- `WALLET_PASSES_TABLE`: use `QueryCommand` on `MERCHANT_PUSH#<merchantId>` PK for per-merchant queries — not `ScanCommand`
- Apple/Google Wallet returns 501 gracefully when env vars absent
