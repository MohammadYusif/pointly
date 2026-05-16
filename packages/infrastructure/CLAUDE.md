# Infrastructure – `packages/infrastructure`

Terraform IaC. Region: `eu-west-1`. Two environments via Terraform workspaces: `dev` / `prod`.

## Structure

```
terraform/
  main.tf, variables.tf, outputs.tf, providers.tf, versions.tf, backend.tf
  environments/   dev.tfvars, prod.tfvars
  bootstrap/      one-time state bucket + lock table setup
  modules/
    api/          Lambda (4 fns) + API Gateway + SQS + IAM
    auth/         Cognito (merchant + customer pools)
    database/     DynamoDB (7 tables, on-demand)
    frontend/     Merchant dashboard S3 + CloudFront
    customer-portal/ Customer portal S3 + CloudFront
    landing/      Landing page S3 + CloudFront
    monitoring/   CloudWatch alarms + dashboard + SNS
```

## State Backend

- S3: `pointly-terraform-state-759316130972` (`eu-west-1`)
- Lock: `pointly-terraform-locks` (DynamoDB)
- Key: `infrastructure/terraform.tfstate`

## Common Workflows

```bash
# First-time setup
cd terraform && bash bootstrap.sh
terraform init
terraform workspace new dev && terraform workspace new prod

# Deploy
pnpm --filter @pointly/api build:lambda:all           # build zips first
terraform workspace select dev
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"

# After frontend build — sync to S3 + invalidate CF
aws s3 sync ./out s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Key Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `environment` | Yes | `dev` or `prod` — controls resource naming |
| `lambda_zip_path` | Yes | Pre-built main API Lambda zip |
| `lambda_decay/tier_reset/sms_consumer_zip_path` | No | Skip if empty |
| `domain_name` | No | e.g. `pointly.sa` |
| `certificate_arn` | No | ACM cert — must be in `us-east-1` |
| `sms_provider_api_key`, `moyasar_secret_key`, `moyasar_webhook_secret` | No | Set via `TF_VAR_*` in CI only |

## Modules

- **database**: 7 DynamoDB tables on-demand — `user_ledger`, `transaction_audit`, `idempotency`, `qr_nonce`, `pending_consents`, `sms_quota`, `wallet_passes`
- **auth**: Merchant pool (email/password, `custom:merchantId/businessName/tier`) + Customer pool (phone OTP, CUSTOM_AUTH)
- **api**: 4 Lambda functions + HTTP API GW (`{proxy+}` greedy) + SQS SMS queue + IAM role (DynamoDB full + SQS send)
- **frontend/customer-portal/landing**: S3 + CloudFront per app; custom domains if `domain_name` set
- **monitoring**: CloudWatch alarms (Lambda errors/duration, DynamoDB throttles, API GW 5xx) + SNS email alerts

## Gotchas

- **Lambda zips must be pre-built** — Terraform does not run `npm build`
- **ACM cert must be in `us-east-1`** — CloudFront requirement even though all other resources are `eu-west-1`
- **Workspace ≠ environment prefix** — `environment` variable and workspace name must both match
- **`user_ledger` is single-table** — holds Customers (`CUSTOMER#`) and Merchants (`MERCHANT#`); do not create separate tables
- **SMS flow**: API Lambda → SQS → `sms-consumer` Lambda → Taqnyat REST API
- **`api` subdomain**: served via a separate CF distribution proxying to API GW — no custom domain on API GW itself
- **Sensitive vars**: never commit `sms_provider_api_key`, `moyasar_secret_key`, `moyasar_webhook_secret` to tfvars — CI only via `TF_VAR_*`
- **State lock**: if `apply` is interrupted, run `terraform force-unlock <lock-id>` to clear
