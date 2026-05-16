# Pointly

Multi-tenant SaaS loyalty platform for the Saudi market. Merchants run loyalty programs; customers earn and redeem points across a unified network.

## Architecture

```
Browser / POS
    │
    ├── merchant.pointly.sa  →  Next.js (S3 + CloudFront)
    ├── customer.pointly.sa  →  Next.js (S3 + CloudFront)
    └── pointly.sa           →  Next.js static (S3 + CloudFront)
                                          │
                                api.pointly.sa
                          (CloudFront → API Gateway → Lambda)
                                          │
                          ┌───────────────┼───────────────┐
                       DynamoDB         SQS           Cognito
                   (single-table)   (SMS queue)   (2 user pools)
                                          │
                                  SMS Consumer Lambda
                                          │
                                       Taqnyat
```

## Monorepo Structure

```
apps/
  api/                  # Fastify 5 — DDD/Clean Architecture, AWS Lambda (Node 22)
  merchant-dashboard/   # Next.js 15 — merchant admin panel
  customer-portal/      # Next.js 15 — customer app (phone OTP login)
  landing/              # Next.js 15 static export — marketing site

packages/
  shared/               # TypeScript types + utilities (phone, formatting, tier config)
  ui/                   # Shared React components (Button, Card, LanguageToggle, etc.)
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
| Frontend | Next.js 15, React 18/19, Tailwind CSS v4 |
| Database | DynamoDB (AWS SDK v3, single-table design) |
| Auth | AWS Cognito — merchant pool (SRP) + customer pool (OTP) |
| Infrastructure | Terraform — `packages/infrastructure/terraform/` |
| Monorepo | pnpm 10 + Turborepo |
| Linter | Biome 1.9.4 |
| Tests | Vitest (API only) |
| SMS | Taqnyat REST API |
| Payments | Moyasar (merchant signup) |

## Quick Start

```bash
# Prerequisites: Node.js >= 22, pnpm >= 10, Docker

pnpm install
pnpm docker:up      # local DynamoDB on :8000
pnpm seed           # seed test data
pnpm dev            # all apps
```

Individual apps:
```bash
pnpm --filter @pointly/api dev                  # :3000
pnpm --filter @pointly/merchant-dashboard dev   # :3000
pnpm --filter @pointly/customer-portal dev      # :3001
pnpm --filter @pointly/landing dev              # :3002
```

## Domain Model

### Customer Tiers

| Tier | Monthly Points | Multiplier | Decay Immune |
|------|---------------|-----------|--------------|
| Bronze | 0 - 4,999 | 1.0x | No |
| Gold | 5,000 - 9,999 | 1.1x | Yes |
| Platinum | 10,000 - 14,999 | 1.15x | Yes |
| Diamond | 15,000+ | 1.2x | Yes |

Redemption rate: **0.01 SAR per point** (all tiers).

### Points System

- **Dual wallet**: global points (spendable anywhere) + merchant points (store-specific)
- **Earning**: 1 SAR = 1 point x tier multiplier
- **Decay**: 12-month grace, then 5%/month (months 12-17), then 15%/month + wipe merchant points (18+). Gold+ immune for global points.
- **Tier progress**: resets monthly; evaluated lazily on first transaction if cron missed

## Key Commands

```bash
pnpm check                                     # Biome lint + format (auto-fix)
pnpm type-check                                # tsc --noEmit all packages
pnpm --filter @pointly/api test                # Vitest
pnpm --filter @pointly/api build:lambda:all    # Build Lambda zips for deploy
pnpm infra:deploy                              # terraform apply (dev workspace)
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — agentic engineering guide (conventions, RPI workflow, rules)
- [apps/api/CLAUDE.md](apps/api/CLAUDE.md) — API architecture, routes, gotchas
- [apps/merchant-dashboard/CLAUDE.md](apps/merchant-dashboard/CLAUDE.md) — dashboard guide
- [apps/customer-portal/CLAUDE.md](apps/customer-portal/CLAUDE.md) — portal guide
- [packages/shared/CLAUDE.md](packages/shared/CLAUDE.md) — shared types + utilities
- [packages/infrastructure/CLAUDE.md](packages/infrastructure/CLAUDE.md) — Terraform guide
- [specs/](specs/) — feature specs (created per RPI workflow)

## License

Proprietary — All rights reserved
