# API Architecture

A developer-oriented map of the `apps/api` service. Read this before touching the codebase.

## Layer Structure

```
src/
├── domain/          ← Business rules. No framework imports. No I/O.
├── application/     ← Use cases + repository/service interfaces.
├── infrastructure/  ← DynamoDB, SQS, Cognito implementations.
└── presentation/    ← Fastify routes, Lambda handlers, DI container.
```

**Domain** (`domain/`): Entities (`Customer`, `Merchant`, `Transaction`), value objects (`Points`, `Money`, `PhoneNumber`), and domain errors. Zero external dependencies — all rules live here.

**Application** (`application/use-cases/`): Orchestrate domain objects and call repositories/services through interfaces. Never import infrastructure directly. One use case per operation.

**Infrastructure** (`infrastructure/`): Concrete DynamoDB repositories, `TransactionalWriter`, `IdempotencyService`, `SmsPublisherService`. Implements application interfaces.

**Presentation** (`presentation/http/`): Fastify route handlers, Cognito auth plugins, the DI container (`container.ts`). Routes are thin — validate input with Zod, call a use case, send the result.

---

## Dual-Points System

Every purchase awards two independent point currencies:

- **Merchant points** — spendable only at the issuing merchant. Configured per merchant (`pointsPerSAR`, min purchase, etc.). Used for redemption first in smart-redeem.
- **Global points (Pointly Network)** — spendable at any enrolled merchant. Awarded at `globalPointsPerSAR` (currently 1 pt/SAR for all tiers). The `boostedGlobalPoints` value applies the customer's tier earning multiplier.

The `Customer` entity holds both balances independently. `RecordPurchaseUseCase` writes two `Transaction` records (one per currency) plus the updated customer and merchant atomically.

---

## Customer Tier System

Defined in [`domain/config/TierConfig.ts`](src/domain/config/TierConfig.ts) — the single source of truth.

| Tier | Monthly Points | Multiplier | Decay |
|------|---------------|------------|-------|
| Bronze | 0 – 4,999 | 1.0x | Yes |
| Gold | 5,000 – 9,999 | 1.1x | Immune |
| Platinum | 10,000 – 14,999 | 1.15x | Immune |
| Diamond | 15,000+ | 1.2x | Immune |

`monthlyProgress` accumulates during the month. On first transaction of a new month the `Customer` entity lazily resets progress and re-evaluates the tier (see `Customer.maybeLazyResetMonthlyProgress`). Tier upgrades happen immediately; downgrades happen one level per month via `ProcessMonthlyTierResetUseCase`.

---

## Atomic Write Pattern

DynamoDB `TransactWriteItems` supports a maximum of **25 items** (exported as `TRANSACT_WRITE_MAX_ITEMS` from `TransactionalWriter`). Every financial operation goes through `TransactionalWriter.writeAll()`.

Item budget by operation:
- `RecordPurchase`: 4 items (2 txns + customer + merchant)
- `RedeemPoints`: 3–4 items (1–2 txns + customer + merchant)
- `EnrollCustomer` (consent granted): 3 items (customer profile + merchant index + merchant)
- `ProcessDecay`: 2 items (expiration txn + customer)

**`toPersistenceItem(entity)`** — returns `[profile]` only. Use for every write except enrollment.

**`toEnrollmentItems(entity, merchantId)`** — returns `[profile, GSI2 index item]`. Use only when granting consent during enrollment. The index item powers `findByMerchant()` via the GSI2 adjacency list.

---

## Smart Redemption Algorithm

`RedeemPointsUseCase` deducts merchant points first, then global points for any remainder:

```
merchantUsed = min(pointsToRedeem, merchantPointsBalance)
globalUsed   = pointsToRedeem - merchantUsed
```

The backend enforces the real balances; the frontend shows only merchant balance (global balance is intentionally hidden from merchant-scoped API responses for customer privacy).

---

## Decay Schedule

Runs monthly via `ProcessPointsDecayUseCase` (EventBridge → Lambda).

| Phase | Months of inactivity | Decay rate |
|-------|---------------------|------------|
| Grace | 0 – 11 | 0% (engagement SMS at 3, 6, 9 months) |
| Phase 1 | 12 – 17 | 5% per month |
| Phase 2 | 18+ | 15% per month |

Gold, Platinum, and Diamond customers are decay-immune (`TierConfig.decays = false`). Decay is applied to `globalPointsBalance` only; merchant balances are unaffected. SMS is only sent during KSA legal hours (08:00–22:00 UTC+3).

---

## Idempotency Pattern

`RecordPurchaseUseCase` and `RedeemPointsUseCase` require an `idempotencyKey` (client-generated UUID). Before executing:

1. `IIdempotencyService.getResult(key)` — return cached response immediately if found.
2. Execute the operation.
3. `IIdempotencyService.storeResult(key, response, ttlSeconds)` — persist with 1-hour TTL.

The DynamoDB idempotency item uses `ConditionExpression: 'attribute_not_exists(PK)'` so concurrent duplicates are rejected at the DB level.

---

## Use Case Reference

| Use Case | Trigger | Key output |
|----------|---------|-----------|
| `EnrollCustomerUseCase` | `POST /v1/me/enroll`, `POST /v1/merchants/:id/register-customer` | Enrollment + optional welcome bonus |
| `RecordPurchaseUseCase` | `POST /v1/purchases` | Dual points, tier info, idempotent |
| `RedeemPointsUseCase` | `POST /v1/purchases/redeem` | Smart-redeem result, new balances |
| `ProcessPointsDecayUseCase` | EventBridge monthly schedule | Batch decay + engagement SMS |
| `ProcessMonthlyTierResetUseCase` | EventBridge monthly schedule | Tier downgrades, progress reset |
| `GetAnalyticsUseCase` | `GET /v1/merchants/:id/analytics` | Time-series aggregates |
| `GenerateQRCodeUseCase` | `POST /v1/me/qr-code` | Short-lived signed nonce |
