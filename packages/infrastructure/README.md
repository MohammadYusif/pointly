# Pointly Infrastructure

Terraform IaC for all AWS resources. Region: `eu-west-1` (Ireland). Two environments via Terraform workspaces: `dev` / `prod`.

See [CLAUDE.md](CLAUDE.md) for the full guide (modules, variables, workflows, gotchas).

## Quick Start

```bash
cd packages/infrastructure/terraform

# First time only
bash bootstrap.sh
terraform init
terraform workspace new dev

# Deploy
terraform workspace select dev
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

**Always build Lambda zips before `terraform apply`** when API code changed:
```bash
pnpm --filter @pointly/api build:lambda:all
```

## Modules

| Module | What it provisions |
|--------|--------------------|
| `database` | 7 DynamoDB tables (on-demand) |
| `auth` | Merchant Cognito pool (email/SRP) + Customer pool (phone OTP) |
| `api` | 4 Lambda functions + HTTP API Gateway + SQS SMS queue + IAM |
| `frontend` | Merchant dashboard S3 + CloudFront |
| `customer-portal` | Customer portal S3 + CloudFront |
| `landing` | Landing page S3 + CloudFront |
| `monitoring` | CloudWatch alarms + dashboard + SNS alerts |

## State

- S3 bucket: `pointly-terraform-state-759316130972` (`eu-west-1`)
- Lock table: `pointly-terraform-locks` (DynamoDB)

## Sensitive Variables

Pass via `TF_VAR_*` in CI — never commit to tfvars:
`sms_provider_api_key`, `moyasar_secret_key`, `moyasar_webhook_secret`
