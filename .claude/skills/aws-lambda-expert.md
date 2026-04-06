# AWS Lambda Expert — Pointly Serverless Context

> Load this skill when working with Lambda configuration, packaging,
> cold start optimization, memory tuning, or troubleshooting in Pointly.

## Environment

- **Runtime**: Node.js 22.x
- **Region**: `me-south-1` (Bahrain)
- **Package Manager**: pnpm 10+
- **Build Tool**: esbuild (via custom build script)
- **Framework**: Fastify 5 (HTTP API)

## Lambda Functions

| Function | Handler | Memory | Timeout | Trigger |
|----------|---------|--------|---------|---------|
| Main API | `src/presentation/http/lambda.handler` | 1024 MB | 30s | API Gateway HTTP proxy |
| Decay Cron | `src/infrastructure/cron/decay.handler` | 512 MB | 60s | EventBridge (monthly) |
| Tier Reset Cron | `src/infrastructure/cron/tierReset.handler` | 512 MB | 60s | EventBridge (monthly) |
| SMS Consumer | `src/infrastructure/sqs/smsConsumer.handler` | 512 MB | 30s | SQS queue |

## Build Process

Lambda zips must be pre-built before Terraform apply:

```bash
pnpm --filter @pointly/api build:lambda:all
```

This creates optimized bundles in `apps/api/.build/`:
- `lambda.zip` — Main API handler
- `lambda-decay.zip` — Decay cron handler
- `lambda-tier-reset.zip` — Tier reset cron handler
- `lambda-sms-consumer.zip` — SMS consumer handler

### Build Configuration
- **Bundler**: esbuild with external dependencies (aws-sdk, etc.)
- **Target**: Node.js 22
- **Platform**: Node.js
- **Minification**: Enabled for production
- **Source Maps**: Disabled for production

## Cold Start Optimization

### Current Strategies
1. **Minimal bundle size** — tree-shaking, external dependencies
2. **Memory allocation** — 1024 MB = 1 vCPU, 1769 MB = 2 vCPU
3. **Provisioned concurrency** — not currently used (cost consideration)
4. **Lazy initialization** — DynamoDB client created outside handler

### Cold Start Reduction Techniques
- Keep bundle size < 5 MB
- Use `aws-sdk` v3 (modular imports)
- Initialize clients outside handler (connection reuse)
- Consider Provisioned Concurrency for latency-sensitive endpoints

## Memory & Performance Tuning

### Memory Allocation Guide
| Memory | vCPU | Network | Use Case |
|--------|------|---------|----------|
| 512 MB | 0.5 | Baseline | Cron jobs, background processing |
| 1024 MB | 1 | 2x baseline | Main API handler (current) |
| 1769 MB | 2 | 3x baseline | CPU-intensive operations |
| 3008 MB | 3 | 5x baseline | Heavy data processing |

### Performance Monitoring
- **CloudWatch Metrics**: Duration, Errors, Throttles, Concurrent Executions
- **X-Ray**: Enabled for distributed tracing
- **Logs**: Structured JSON logging with request IDs

## Environment Variables

All Lambda functions receive these env vars from Terraform:

| Variable | Source | Purpose |
|----------|--------|---------|
| `NODE_ENV` | Terraform | Environment detection |
| `API_PORT` | Terraform | Local dev port (ignored in Lambda) |
| `DYNAMODB_TABLE_USER_LEDGER` | Database module | Main table name |
| `DYNAMODB_TABLE_TRANSACTION_AUDIT` | Database module | Audit table name |
| `DYNAMODB_TABLE_IDEMPOTENCY` | Database module | Idempotency table |
| `DYNAMODB_TABLE_QR_NONCE` | Database module | QR nonce table |
| `COGNITO_MERCHANT_POOL_ID` | Auth module | Merchant Cognito pool |
| `COGNITO_CUSTOMER_POOL_ID` | Auth module | Customer Cognito pool |
| `COGNITO_MERCHANT_CLIENT_ID` | Auth module | Merchant client |
| `COGNITO_CUSTOMER_CLIENT_ID` | Auth module | Customer client |
| `JWKS_URI_MERCHANT` | Auth module | Merchant JWKS endpoint |
| `JWKS_URI_CUSTOMER` | Auth module | Customer JWKS endpoint |
| `SMS_QUEUE_URL` | API module | SQS queue for SMS |

## IAM Permissions

Lambda execution roles include:
- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan`
- `dynamodb:BatchGetItem`, `BatchWriteItem`
- `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- `xray:PutTraceSegments`, `xray:PutTelemetryRecords`

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Timeout errors | Long-running operation | Increase timeout, optimize query |
| Memory errors | Bundle too large | Tree-shake, externalize deps |
| Cold start spikes | Infrequent invocations | Provisioned concurrency |
| Throttling | Too many concurrent requests | Increase concurrency limit |
| Missing env vars | Terraform not applied | Run `terraform apply` |

### Debug Commands
```bash
# Check function configuration
aws lambda get-function-configuration --function-name <name> --region me-south-1

# View recent logs
aws logs tail /aws/lambda/<function-name> --region me-south-1 --since 1h

# Test function locally
pnpm --filter @pointly/api dev

# Check bundle size
ls -lh apps/api/.build/*.zip
```

## Best Practices

1. **Keep handlers thin** — delegate to use cases
2. **Reuse connections** — create DynamoDB client outside handler
3. **Handle errors gracefully** — return proper HTTP status codes
4. **Use structured logging** — JSON format with request IDs
5. **Set appropriate timeouts** — don't use default 3s
6. **Monitor concurrency** — set reserved concurrency if needed
7. **Test locally first** — use `pnpm dev` before deploying
