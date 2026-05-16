# Pointly API

Fastify 5 REST API, deployed as AWS Lambda (Node 22). Clean/DDD architecture backed by DynamoDB.

See [CLAUDE.md](CLAUDE.md) for the full engineering guide (architecture, routes, gotchas).

## Quick Start

```bash
# From monorepo root
pnpm docker:up && pnpm seed

# From apps/api
pnpm dev        # hot-reload on :3000
pnpm test       # Vitest
pnpm type-check # tsc --noEmit
```

## Architecture

Clean/DDD layers — dependencies flow inward only:

```
domain/         # Entities, value objects, errors — no I/O
application/    # Use cases, repository + service interfaces
infrastructure/ # DynamoDB repositories, env config, TransactionalWriter
presentation/   # Fastify routes, DI container, Cognito auth plugins
```

## Auth

Two Cognito pools, two auth plugins:
- **Merchant** (`cognitoAuth`) — email/password, injects `request.merchant`
- **Customer** (`cognitoCustomerAuth`) — phone OTP, injects `request.customer`

Both expect the **ID token** (not access token).

## Key Conventions

- All multi-entity writes use `TransactionalWriter.writeAll()`
- Purchases and redemptions require a client-generated `idempotencyKey`
- Phone numbers stored in E.164 — use `new PhoneNumber(raw).toE164()`, not `normalizePhone()`
- Domain types are local to this package — no dependency on `@pointly/shared`

## Lambda Build

```bash
pnpm build:lambda:all   # outputs 4 zips: api, decay, tier-reset, sms-consumer
```

Always rebuild before `terraform apply` when API code changes.

## Environment Variables

Required: `USER_LEDGER_TABLE`, `TRANSACTION_TABLE`, `IDEMPOTENCY_TABLE`, `QR_NONCE_TABLE`, `PENDING_CONSENTS_TABLE`, `SMS_QUOTA_TABLE`, `SMS_QUEUE_URL`, `WALLET_PASSES_TABLE`, `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET`

Optional: Cognito pool IDs, VAPID keys, Apple/Google Wallet certs, S3 assets, `DYNAMODB_ENDPOINT` (local dev).
