# Pointly

A multi-tenant SaaS loyalty platform for the Saudi Arabian market. Merchants run loyalty programs; customers earn and redeem points across a unified network.

## Architecture

```
Browser / POS
    │
    ├── merchant.pointly.sa  (Next.js → S3 + CloudFront)
    ├── customer.pointly.sa  (Next.js → S3 + CloudFront)
    └── pointly.sa           (Next.js static → S3 + CloudFront)
                                         │
                               api.pointly.sa
                          (CloudFront → API Gateway → Lambda)
                                         │
                          ┌──────────────┼──────────────┐
                     DynamoDB          SQS           Cognito
                  (single-table)    (SMS queue)   (2 user pools)
                                         │
                                   SMS Consumer Lambda
                                         │
                                      Taqnyat
                                   (SMS delivery)
```

### AWS Services

| Service | Purpose |
|---------|---------|
| Lambda (Node 22) | API handler, decay cron, tier-reset cron, SMS consumer |
| API Gateway (REST) | HTTP proxy to API Lambda |
| CloudFront | CDN for all 4 domains — one wildcard ACM cert covers everything |
| DynamoDB | Single-table design — 7 tables |
| Cognito | Merchant pool (email/password) + Customer pool (OTP/phone) |
| SQS | Async SMS dispatch queue with DLQ |
| EventBridge | Monthly decay + tier-reset cron triggers |
| WAFv2 | Rate limiting + managed rule groups on API Gateway |
| CloudWatch | Logs, metrics, alarms, dashboard |

## Monorepo Structure

```
apps/
  api/                  # Fastify 5 API — DDD, Clean Architecture
  merchant-dashboard/   # Next.js 15 — merchant admin panel
  customer-portal/      # Next.js 15 — customer-facing app (OTP login)
  landing/              # Next.js 15 static export — marketing site

packages/
  shared/               # TypeScript types + utilities (phone, formatting, tier config)
  ui/                   # Shared React components (Button, Card, Sheet, LanguageToggle)
  i18n/                 # RTL/LTR context + translation hooks
  http-client/          # Thin fetch wrapper factory
  infrastructure/       # Terraform IaC — 7 modules, eu-west-1
  assets/               # Brand assets (logos, icons)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5 |
| API | Fastify 5 on AWS Lambda (Node.js 22) |
| Frontend | Next.js 15, React 18/19 |
| Database | DynamoDB (AWS SDK v3, single-table design) |
| Auth | AWS Cognito — merchant pool (SRP) + customer pool (CUSTOM_AUTH OTP) |
| Infrastructure | Terraform (not CDK) — `packages/infrastructure/terraform/` |
| Monorepo | pnpm 10 + Turborepo |
| Linter | Biome 1.9.4 — no ESLint, no Prettier |
| Tests | Vitest (API only) |
| SMS | Taqnyat REST API |
| Payments | Moyasar (merchant signup gating) |

## Quick Start

### Prerequisites

- Node.js ≥ 22
- pnpm ≥ 10 (`corepack enable`)
- Docker (for local DynamoDB)

### Local Development

```bash
# Install dependencies
pnpm install

# Start local DynamoDB
pnpm docker:up

# Seed test data
pnpm seed

# Run all apps
pnpm dev
```

Individual apps:

```bash
pnpm --filter @pointly/api dev           # API on :3000
pnpm --filter @pointly/landing dev       # Landing on :3002
pnpm --filter @pointly/merchant-dashboard dev   # Dashboard on :3000
pnpm --filter @pointly/customer-portal dev      # Customer portal on :3001
```

### Environment Variables

Each app has its own env vars. See the sub-`CLAUDE.md` files in each `apps/` directory for the full list. Quick reference:

| App | Key vars |
|-----|---------|
| API | `USER_LEDGER_TABLE`, `MERCHANT_USER_POOL_ID`, `MOYASAR_SECRET_KEY`, `SMS_QUEUE_URL` |
| Merchant Dashboard | `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_API_URL` |
| Customer Portal | `NEXT_PUBLIC_CUSTOMER_USER_POOL_ID`, `NEXT_PUBLIC_API_URL` |
| Landing | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MERCHANT_URL` |

## Domain Model

### Customer Tiers

| Tier | Monthly Points | Multiplier | Decay Immune |
|------|---------------|-----------|--------------|
| Bronze | 0 – 4,999 | 1.0× | No |
| Gold | 5,000 – 9,999 | 1.1× | Yes |
| Platinum | 10,000 – 14,999 | 1.15× | Yes |
| Diamond | 15,000+ | 1.2× | Yes |

Redemption rate: **0.01 SAR per point** (all tiers).

### Merchant Plans

| Plan | Price | Locations | SMS/month | Min Purchase |
|------|-------|-----------|-----------|--------------|
| Basic | 75 SAR/mo | 1 | 100 | 10 SAR |
| Professional | 105 SAR/mo | 3 | 500 | 5 SAR |
| Enterprise | 175 SAR/mo | Unlimited | 2,000 | None |

### Points System

- **Dual wallet**: global points (spendable at any merchant) + merchant points (store-specific)
- **Earning**: 1 SAR spent = 1 point × tier multiplier
- **Decay**: 12-month grace, then 5%/month (months 12–17), then 15%/month (month 18+). Gold+ tiers are decay-immune for global points.
- **Tier progress**: resets monthly; evaluated lazily on first transaction of the new month if cron missed a run

## Key Commands

```bash
pnpm check                            # Biome lint + format (auto-fix)
pnpm type-check                       # tsc --noEmit all packages
pnpm --filter @pointly/api test       # Vitest
pnpm build                            # Build all packages
pnpm --filter @pointly/api build:lambda:all  # Build Lambda zips for deployment
pnpm infra:deploy                     # terraform apply (dev workspace)
```

## Infrastructure

Terraform state is stored in S3 (`pointly-terraform-state-*`) with DynamoDB locking. Two environments via Terraform workspaces:

```bash
cd packages/infrastructure/terraform
terraform workspace select prod
terraform apply -var-file="environments/prod.tfvars"
```

See [`packages/infrastructure/CLAUDE.md`](packages/infrastructure/CLAUDE.md) for the full infra guide.

## License

Proprietary — All rights reserved
