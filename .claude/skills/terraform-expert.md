# Terraform Expert — Pointly Infrastructure Context

> This is a reference context document, not a plugin skill. Load this file when working on
> `packages/infrastructure/` to get deep context on Pointly's AWS module architecture.
> For a full reference, also read `packages/infrastructure/CLAUDE.md`.

## Environment

- **Provider**: AWS, region `me-south-1` (Bahrain)
- **State backend**: S3 bucket `pointly-terraform-state-759316130972`, DynamoDB lock table `pointly-terraform-locks`
- **Workspaces**: `dev` and `prod` — always confirm active workspace before planning
- **Environments**: `environments/dev.tfvars` and `environments/prod.tfvars`

## Module Map

```
terraform/modules/
  api/              Lambda × 3, API Gateway (HTTP, greedy proxy), SQS, IAM roles
  auth/             Cognito User Pool (merchants) + Cognito User Pool (customers)
  database/         DynamoDB × 7 (all on-demand billing)
  frontend/         S3 + CloudFront (merchant-dashboard)
  customer-portal/  S3 + CloudFront (customer portal)
  landing/          S3 + CloudFront (landing page)
  monitoring/       CloudWatch alarms, dashboard, SNS email alerts
```

## DynamoDB Tables (module: database)

| Logical Name | DynamoDB Table Name Pattern | Purpose |
|---|---|---|
| user_ledger | `Pointly-UserLedger-{env}` | Customers + Merchants (PK prefix differentiates) |
| transaction_audit | `Pointly-TransactionAudit-{env}` | All transactions |
| idempotency | `Pointly-Idempotency-{env}` | Dedup keys (TTL-based) |
| qr_nonce | `Pointly-QRNonce-{env}` | QR code nonces (short TTL) |
| pending_consents | `Pointly-PendingConsents-{env}` | Consent approval queue |
| sms_quota | `Pointly-SMSQuota-{env}` | Per-merchant SMS usage |
| wallet_passes | `Pointly-WalletPasses-{env}` | Apple/Google Wallet data |

**Single-table design**: `user_ledger` holds both Customers (`CUSTOMER#<ulid>`) and Merchants (`MERCHANT#<id>`). Do not split them.

## Lambda Functions (module: api)

| Function | Zip variable | Trigger |
|---|---|---|
| Main API | `lambda_zip_path` | API Gateway HTTP proxy |
| Decay cron | `lambda_decay_zip_path` | EventBridge monthly |
| Tier reset cron | `lambda_tier_reset_zip_path` | EventBridge monthly |

**Critical**: Lambda zips must be pre-built before `terraform apply`:
```bash
pnpm --filter @pointly/api build:lambda:all
```

## Cognito Pools (module: auth)

| Pool | Auth Flow | Custom Attributes |
|---|---|---|
| Merchant | SRP (email + password) | `custom:merchantId`, `custom:businessName`, `custom:tier` |
| Customer | CUSTOM_AUTH (OTP via SNS) | `phone_number` as username |

Pool IDs and client IDs are wired into the API module as env vars and into frontend modules as outputs.

## CloudFront Setup (modules: frontend, customer-portal, landing)

- S3 origin with OAC (Origin Access Control)
- Custom domains require ACM cert in **`us-east-1`** (not me-south-1) for CloudFront
- Merchant dashboard: `merchant.<domain_name>`
- Customer portal: `customer.<domain_name>`
- Landing: `<domain_name>` (root)

## Monitoring (module: monitoring)

Alarms wired to: Lambda error rate, Lambda p99 duration, DynamoDB throttles, API Gateway 5xx rate, CloudFront 5xx rate. SNS → email via `alarm_email` variable.

## Common Workflows

### New Table

1. Add resource in `modules/database/main.tf`
2. Add output in `modules/database/outputs.tf`
3. Pass table name + ARN into `modules/api/` (main.tf wiring)
4. Add env var to Lambda function in `modules/api/main.tf`
5. Add DynamoDB policy statement in `modules/api/iam.tf`

### New Lambda Environment Variable

1. Add to `modules/api/main.tf` under `environment.variables`
2. Add to `apps/api/src/infrastructure/config/Environment.ts` Zod schema
3. Rebuild Lambda zip before apply

### New CloudWatch Alarm

Add in `modules/monitoring/main.tf` following existing alarm pattern.
Wire `alarm_actions = [aws_sns_topic.alerts.arn]`.

### Workspace Commands

```bash
terraform workspace list
terraform workspace select dev
terraform workspace select prod

# Never apply without explicit workspace confirmation:
terraform workspace show   # Confirm active workspace first
terraform plan -var-file="environments/$(terraform workspace show).tfvars"
terraform apply -var-file="environments/$(terraform workspace show).tfvars"
```

## Safety Rules (Enforced by .claude/settings.json)

- `terraform apply` and `terraform destroy` require **explicit user permission** per session
- `git push --force` and `git reset --hard` are blocked
- Always run `terraform plan` and show the diff before proposing `apply`
- State lock errors: `terraform force-unlock <id>` — only run if you can confirm no apply is in progress

## Gotchas

- ACM cert for CloudFront MUST be in `us-east-1`, not `me-south-1`
- `user_ledger` is single-table — never create separate Customer/Merchant tables
- SQS queue (`sms_queue`) is for async SMS only — API publishes, a separate processor consumes
- Terraform workspace name and `environment` variable must both match — they control resource naming independently
- Force-unlock a state lock only after confirming no concurrent apply is running (check CI first)
