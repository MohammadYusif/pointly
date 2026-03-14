# Pointly – Agentic Engineering Guide

> **Stack clarification**: This project uses **DynamoDB** (AWS SDK v3), NOT Prisma.
> Prisma is a SQL ORM; this is a NoSQL single-table design. Any migration to a
> SQL/Prisma layer requires a full data-model redesign — treat it as a separate epic.

## Tech Stack

- **API**: Fastify 5 on AWS Lambda (Node 20), DynamoDB, Clean/DDD architecture
- **Dashboards**: Next.js 16 (merchant), Next.js 15 (customer portal + landing), React 18/19
- **Infrastructure**: Terraform — 7 modules, AWS `me-south-1` (Bahrain)
- **Monorepo**: pnpm 10+ / Turbo
- **Linter**: Biome 1.9.4 — no ESLint, no Prettier
- **Tests**: Vitest (API only)

## Prerequisites

- **Node.js** ≥ 20 (`engines` enforced in `package.json`)
- **pnpm** ≥ 10 (`packageManager: pnpm@10.28.2`)
- **Docker** — required for local DynamoDB (`pnpm docker:up`)
- **Terraform** — only for infra changes (`packages/infrastructure`)

## Monorepo — Always Read the Sub-CLAUDE.md First

```
apps/api/                  → apps/api/CLAUDE.md
apps/merchant-dashboard/   → apps/merchant-dashboard/CLAUDE.md
apps/customer-portal/      → apps/customer-portal/CLAUDE.md
apps/landing/              → apps/landing/CLAUDE.md
packages/shared/           → packages/shared/CLAUDE.md
packages/ui/               → packages/ui/CLAUDE.md
packages/infrastructure/   → packages/infrastructure/CLAUDE.md
```

## RPI Workflow (MANDATORY for non-trivial tasks)

**Non-trivial** = touches >2 files, introduces a new pattern, or changes domain logic.
Run `/rpi` to orchestrate all three phases, or invoke phases individually.

### Phase 1 — Research (`/rpi-research`)

- Read all CLAUDE.md files for affected areas
- Grep existing patterns before inventing new ones
- Produce a written summary: what exists, what changes, what risks
- **Gate**: Summary reviewed before proceeding

### Phase 2 — Plan (`/rpi-plan`)

- Enter `/plan` mode
- Produce a phase-wise, gated plan with an explicit testing strategy
- Each phase defines: files changed, tests required, commit message
- **Gate**: Plan approved by user before any code is written

### Phase 3 — Implement (`/rpi-implement`)

- Execute one phase at a time
- After each phase: `pnpm check && pnpm type-check` must pass
- Commit after every successful gate
- **Gate**: All tests pass + Biome clean + types clean

## Protocol Rules

```
❌ FORBIDDEN — coding features without an approved RPI plan
❌ FORBIDDEN — touching >2 files without a research phase
❌ FORBIDDEN — committing with Biome errors or TypeScript errors
❌ FORBIDDEN — redefining types that exist in @pointly/shared
✅ REQUIRED  — read sub-CLAUDE.md before touching any app
✅ REQUIRED  — commit after every successful phase gate
✅ REQUIRED  — run pnpm check before every commit
```

## Agent Architecture

| Agent | File | Role | When to use |
|-------|------|------|-------------|
| `architect` | `.claude/agents/architect.md` | Research & design | RPI phases 1–2 |
| `developer` | `.claude/agents/developer.md` | Implementation | RPI phase 3 |
| `qa-tester` | `.claude/agents/qa-tester.md` | Test verification | After each phase gate |

Agents are invoked via the `Task` tool using the agent definition as context.
For infrastructure changes, load `.claude/skills/terraform-expert.md` as context first.

## Commands

| Command | File | Purpose |
|---------|------|---------|
| `/rpi` | `.claude/commands/rpi.md` | Orchestrate full RPI workflow |
| `/rpi-research` | `.claude/commands/rpi-research.md` | Research phase only |
| `/rpi-plan` | `.claude/commands/rpi-plan.md` | Plan phase (enters plan mode) |
| `/rpi-implement` | `.claude/commands/rpi-implement.md` | Implementation phase |

## Core Code Conventions

- **IDs**: ULID — never UUID for new entities
- **Phone**: always `normalizePhone()` from `@pointly/shared` before API calls or DB lookups
- **Types**: import from `@pointly/shared`, never redeclare API shapes locally
- **Auth token**: send the **ID token** (not access token) — it carries `custom:merchantId`
- **Multi-entity writes (API)**: always use `TransactionalWriter.writeAll()` — never write repos individually
- **Idempotency (API)**: always pass a client-generated `idempotencyKey` for purchase/redeem calls
- **Data fetching (frontends)**: TanStack Query hooks only — never fetch directly from components
- **`import type`**: required for type-only imports (Biome error if violated)
- **`any`**: forbidden — use `unknown` + narrowing or proper types

## Dev Commands

```bash
pnpm dev                           # All apps
pnpm check                         # Biome lint+format auto-fix (run before every commit)
pnpm type-check                    # tsc --noEmit all packages
pnpm --filter @pointly/api test    # Vitest
pnpm docker:up                     # Local DynamoDB
pnpm seed                          # Seed test data
pnpm --filter @pointly/api build:lambda:all  # Rebuild before terraform apply
pnpm format                        # Biome format only (auto-fix)
pnpm clean                         # Remove all build artifacts + node_modules
pnpm docker:down                   # Stop local DynamoDB
pnpm infra:deploy                  # Terraform deploy (infra package)
```

## Dev Ports

| App | Port | Start command |
|-----|------|---------------|
| API | 3000 | `pnpm --filter @pointly/api dev` |
| Customer Portal | 3001 | `pnpm --filter @pointly/customer-portal dev` |
| Landing | 3002 | `pnpm --filter @pointly/landing dev` |
| Merchant Dashboard | 3000 | `pnpm --filter @pointly/merchant-dashboard dev` |
| Local DynamoDB | 8000 | `pnpm docker:up` |

> API and Merchant Dashboard both default to port 3000 — run them separately or change one.

## Tier Config (Single Source of Truth)

- **API**: `apps/api/src/domain/config/TierConfig.ts`
- **Frontend**: `packages/shared/src/tier-config.ts` (manually mirrored — update both)

| Tier | Monthly Min | Multiplier | Decay Immune |
|------|------------|------------|--------------|
| Bronze | 0 | 1.0× | No |
| Gold | 5,000 | 1.1× | Yes |
| Platinum | 10,000 | 1.15× | Yes |
| Diamond | 15,000 | 1.2× | Yes |

Redemption rate: **0.01 SAR/point** (all tiers, all merchants).

## Context Hub (Up-to-date API Docs)

This project uses [Context Hub](https://github.com/andrewyng/context-hub) to provide
agents with curated, versioned API documentation — reducing hallucinations for external
service calls.

### Setup

```bash
npm install -g @aisuite/chub
```

### Usage

```bash
chub search <service>              # Find available docs (e.g. "aws dynamodb")
chub get <id> --lang js            # Fetch JS-specific docs for a service
chub annotate <id> "<note>"        # Save local notes for future sessions
chub feedback <id> up|down         # Rate doc quality
```

**When to use**: Before writing code that calls external APIs (AWS SDK, Cognito, etc.),
search Context Hub first to get accurate, up-to-date reference material instead of
relying on training data.
