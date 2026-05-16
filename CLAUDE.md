# Pointly – Agentic Engineering Guide

> **Stack**: DynamoDB (AWS SDK v3), NOT Prisma. NoSQL single-table design.

## Tech Stack

- **API**: Fastify 5 on AWS Lambda (Node 22), DynamoDB, Clean/DDD architecture
- **Dashboards**: Next.js 15 (merchant + customer portal + landing), React 18/19
- **Infrastructure**: Terraform — 7 modules, AWS `eu-west-1` (Ireland)
- **Monorepo**: pnpm 10+ / Turbo
- **Linter**: Biome 1.9.4 — no ESLint, no Prettier
- **Tests**: Vitest (API only)

## Prerequisites

- Node.js ≥ 22, pnpm ≥ 10, Docker (local DynamoDB), Terraform (infra only)

## Monorepo — Always Read the Sub-CLAUDE.md First

```
apps/api/                  → apps/api/CLAUDE.md
apps/merchant-dashboard/   → apps/merchant-dashboard/CLAUDE.md
apps/customer-portal/      → apps/customer-portal/CLAUDE.md
apps/landing/              → apps/landing/CLAUDE.md
packages/shared/           → packages/shared/CLAUDE.md
packages/ui/               → packages/ui/CLAUDE.md
packages/infrastructure/   → packages/infrastructure/CLAUDE.md
packages/http-client/      → see packages/shared/CLAUDE.md
packages/i18n/             → see packages/shared/CLAUDE.md
packages/assets/           → static brand assets (logos, icons)
```

## RPI Workflow (MANDATORY for non-trivial tasks)

**Non-trivial** = touches >2 files, introduces a new pattern, or changes domain logic.
Run `/rpi` to orchestrate all three phases, or invoke phases individually.

- **Phase 1 — Research** (`/rpi-research`): read sub-CLAUDEs, grep patterns, write summary, save `specs/<slug>.md`
- **Phase 2 — Plan** (`/rpi-plan`): enter plan mode, produce gated phase plan, update spec file
- **Phase 3 — Implement** (`/rpi-implement`): one phase at a time, gate after each

## Specs (`specs/`)

Every non-trivial feature gets a spec file committed alongside the code:

```
specs/
  feature-slug.md   # created during Research, updated during Plan
```

Spec files are the living record of *what* and *why* — not implementation details (those live in the code). Keep them short: problem statement, constraints, decisions made.

## Protocol Rules

```
❌ FORBIDDEN — coding without an approved RPI plan
❌ FORBIDDEN — touching >2 files without a research phase
❌ FORBIDDEN — committing with Biome or TypeScript errors
❌ FORBIDDEN — redefining types that exist in @pointly/shared
❌ FORBIDDEN — starting dev servers or using preview tools
✅ REQUIRED  — read sub-CLAUDE.md before touching any app
✅ REQUIRED  — commit after every successful phase gate
✅ REQUIRED  — run pnpm check before every commit
✅ REQUIRED  — save/update specs/<slug>.md during research and plan phases
```

> Verification = `pnpm check` + `pnpm type-check` + `pnpm --filter @pointly/api test`. Never a dev server.

## Agents

| Agent | File | Role |
|-------|------|------|
| `architect` | `.claude/agents/architect.md` | Research & design (phases 1–2) |
| `developer` | `.claude/agents/developer.md` | Implementation (phase 3) |
| `qa-tester` | `.claude/agents/qa-tester.md` | Gate verification |

For infrastructure changes, load `.claude/skills/terraform-expert.md` as context first.

## Core Code Conventions

- **IDs**: ULID — never UUID for new entities
- **Phone (frontends)**: `normalizePhone()` from `@pointly/shared` before API calls
- **Phone (API internals)**: `new PhoneNumber(raw).toE164()` — domain value object, NOT `normalizePhone()`
- **Types**: import from `@pointly/shared`, never redeclare API shapes locally
- **Auth token**: send the **ID token** (not access token) — it carries `custom:merchantId`
- **Multi-entity writes (API)**: `TransactionalWriter.writeAll()` — never write repos individually
- **Idempotency (API)**: always pass client-generated `idempotencyKey` for purchase/redeem/gift
- **Idempotency keys (frontends)**: `crypto.randomUUID()` — `ulid` unavailable in Next.js
- **Data fetching (frontends)**: TanStack Query hooks only — never fetch from components
- **`import type`**: required for type-only imports (Biome error if violated)
- **`any`**: forbidden — use `unknown` + narrowing

## Dev Commands

```bash
pnpm dev                                      # All apps
pnpm check                                    # Biome lint+format (run before every commit)
pnpm type-check                               # tsc --noEmit all packages
pnpm --filter @pointly/api test               # Vitest
pnpm docker:up / docker:down                  # Local DynamoDB
pnpm seed / seed:clean                        # Seed / wipe+reseed
pnpm --filter @pointly/api build:lambda:all   # Rebuild all 4 Lambda zips before terraform apply
pnpm infra:deploy                             # Terraform deploy
```

## Dev Ports

| App | Port |
|-----|------|
| API / Merchant Dashboard | 3000 (run separately) |
| Customer Portal | 3001 |
| Landing | 3002 |
| Local DynamoDB | 8000 |

## External Services

| Service | Purpose | Auth |
|---------|---------|------|
| **Taqnyat** (`api.taqnyat.sa`) | OTP + loyalty SMS | `Bearer <sms_provider_api_key>` |
| **Moyasar** (`api.moyasar.com`) | Merchant signup payment | `Basic <moyasar_secret_key>:` |

Keys are Lambda env vars via Terraform (`TF_VAR_*` in CI — never hardcoded).

## Custom Domain (when pointly.sa is live)

One ACM cert (`*.pointly.sa`) in **us-east-1** covers all CloudFront distributions:
`pointly.sa` → landing, `merchant.*` → dashboard, `customer.*` → portal, `api.*` → CF proxy to API GW.

Set `domain_name` + `certificate_arn` in `environments/prod.tfvars` to activate.

## Tier Config (Single Source of Truth)

| Tier | Monthly Min | Multiplier | Decay Immune |
|------|------------|------------|--------------|
| Bronze | 0 | 1.0× | No |
| Gold | 5,000 | 1.1× | Yes |
| Platinum | 10,000 | 1.15× | Yes |
| Diamond | 15,000 | 1.2× | Yes |

Redemption rate: **0.01 SAR/point**. Update both:
- API: `apps/api/src/domain/config/TierConfig.ts`
- Frontend: `packages/shared/src/tier-config.ts`
