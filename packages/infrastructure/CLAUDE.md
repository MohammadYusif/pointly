# Infrastructure – `packages/infrastructure`

Terraform IaC for all Pointly AWS resources. Region: `me-south-1` (Bahrain). Two environments via Terraform workspaces: `dev` and `prod`.

## Directory Structure

```
terraform/
  main.tf             # Root module — wires all sub-modules together
  variables.tf        # Input variables (environment, domain, cert ARN, Lambda zip paths)
  outputs.tf          # Root outputs (API URL, CloudFront URLs, etc.)
  providers.tf        # AWS provider config
  versions.tf         # Terraform + provider version constraints
  backend.tf          # S3 state backend config
  environments/       # Per-env tfvars files
    dev.tfvars
    prod.tfvars
  bootstrap/          # One-time state bucket + lock table setup
  bootstrap.sh        # Run once before first terraform init
  modules/
    api/              # Lambda (3 functions) + API Gateway + SQS (SMS queue) + IAM
    auth/             # Cognito User Pools (merchant + customer, separate pools)
    database/         # DynamoDB tables (7, all on-demand)
    frontend/         # Merchant dashboard S3 bucket + CloudFront distribution
    customer-portal/  # Customer portal S3 bucket + CloudFront distribution
    landing/          # Landing page S3 bucket + CloudFront distribution
    monitoring/       # CloudWatch alarms + dashboard + SNS for alerts
```

## State Backend

- **S3 bucket**: `pointly-terraform-state-759316130972` (region: `me-south-1`)
- **Lock table**: `pointly-terraform-locks` (DynamoDB)
- **Key**: `infrastructure/terraform.tfstate`
- State is encrypted at rest. Workspaces create separate state files per environment.

## Environments (Workspaces)

```bash
terraform workspace list
terraform workspace select dev     # or prod
terraform workspace new dev        # first-time setup

# Apply with env-specific vars:
terraform apply -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

Workspaces determine resource naming (e.g. `pointly-dev-api` vs `pointly-prod-api`).

## Key Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `environment` | Yes | `dev` or `prod` |
| `aws_region` | No | Default: `me-south-1` |
| `lambda_zip_path` | Yes | Path to pre-built main API Lambda zip |
| `lambda_decay_zip_path` | No | Decay cron Lambda zip (empty = skip) |
| `lambda_tier_reset_zip_path` | No | Tier reset cron Lambda zip (empty = skip) |
| `domain_name` | No | e.g. `pointly.sa` — merchant gets `merchant.pointly.sa` |
| `certificate_arn` | No | ACM cert ARN for CloudFront (must be in `us-east-1`) |
| `alarm_email` | No | CloudWatch alarm notification recipient |

## Modules

### `modules/database` — DynamoDB Tables (7)

All tables use on-demand billing (`PAY_PER_REQUEST`). Table names output to other modules.

| Table | Purpose |
|-------|---------|
| `user_ledger` | Customers + Merchants (single-table, PK prefix differentiates) |
| `transaction_audit` | All transaction records |
| `idempotency` | Dedup keys for purchases/redemptions (TTL-based) |
| `qr_nonce` | QR code nonces (short TTL) |
| `pending_consents` | Consent approval queue |
| `sms_quota` | Per-merchant SMS usage tracking |
| `wallet_passes` | Apple/Google Wallet pass data |

### `modules/auth` — Cognito User Pools

- **Merchant pool**: email/password SRP auth. Custom attributes: `custom:merchantId`, `custom:businessName`, `custom:tier`
- **Customer pool**: phone-number-only, CUSTOM_AUTH flow (OTP via Lambda trigger or SNS)
- Both pools output their IDs and client IDs to the API and frontend modules

### `modules/api` — Lambda + API Gateway

- **Main function**: Fastify handler (`lambda.zip`)
- **Decay function**: scheduled decay cron (`lambda-decay.zip`)
- **Tier reset function**: scheduled tier reset cron (`lambda-tier-reset.zip`)
- **API Gateway**: HTTP API with greedy proxy route `{proxy+}` — Fastify handles all routing internally
- **SQS queue**: `sms-queue` — Lambda publishes SMS jobs here, SNS (or another Lambda) processes them
- **IAM**: Lambda execution role with DynamoDB full access to all 7 tables + SQS send message

### `modules/frontend` — Merchant Dashboard (S3 + CloudFront)

- S3 bucket for static Next.js export
- CloudFront distribution with S3 origin
- Custom domain: `merchant.<domain_name>` (if `domain_name` set)
- Requires ACM cert in `us-east-1` for CloudFront
- Outputs `distribution_id` for cache invalidation in CI

### `modules/customer-portal` — Customer Portal (S3 + CloudFront)

- Same pattern as `frontend`
- Custom domain: `customer.<domain_name>`

### `modules/landing` — Landing Page (S3 + CloudFront)

- Same pattern
- Custom domain: `<domain_name>` (root domain)

### `modules/monitoring` — CloudWatch

- Alarms: Lambda error rate, Lambda duration, DynamoDB throttles, API Gateway 5xx rate
- CloudWatch dashboard with key metrics
- SNS topic + email subscription for alarm notifications

## Common Workflows

### First-time Setup

```bash
# 1. Bootstrap state backend (one-time only)
cd terraform && bash bootstrap.sh

# 2. Init Terraform
terraform init

# 3. Create workspaces
terraform workspace new dev
terraform workspace new prod
```

### Deploy Changes

```bash
# 1. Build Lambda zips first (API code changes require this)
pnpm --filter @pointly/api build:lambda:all

# 2. Select workspace
terraform workspace select dev

# 3. Plan
terraform plan -var-file="environments/dev.tfvars"

# 4. Apply
terraform apply -var-file="environments/dev.tfvars"
```

### After Frontend Build

Upload `out/` (landing, customer-portal) or `.next/` (merchant-dashboard) to the S3 bucket and invalidate CloudFront:
```bash
aws s3 sync ./out s3://<bucket-name> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```
CI handles this automatically on deploy pipelines.

## Gotchas

- **Lambda zips must be pre-built** — Terraform does not run `npm build`. Always run `pnpm --filter @pointly/api build:lambda:all` before `terraform apply` when API code changed
- **ACM cert must be in `us-east-1`** — CloudFront requires this even though all other resources are in `me-south-1`
- **Workspace ≠ environment prefix** — the `environment` variable controls resource naming, not just the workspace. Both must match
- **Single-table design** — `user_ledger` holds both Customers (`CUSTOMER#<id>`) and Merchants (`MERCHANT#<id>`). Do not create separate tables for them
- **SQS → SMS**: the `sms_queue` is for async SMS delivery. The API publishes to SQS; a separate processor (Lambda or SNS) handles actual SMS sending — not directly from the API Lambda
- **State lock**: if `terraform apply` is interrupted, the DynamoDB lock may not release. Run `terraform force-unlock <lock-id>` to clear it
