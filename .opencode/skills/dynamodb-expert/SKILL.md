---
name: dynamodb-expert
description: DynamoDB single-table design, GSI patterns, query optimization, and access patterns for the Pointly platform. Load when working with DynamoDB queries, table design, or performance optimization.
---

# DynamoDB Expert — Pointly Database Context

## Environment

- **Region**: `me-south-1` (Bahrain)
- **Billing**: All tables use on-demand capacity mode
- **Encryption**: Server-side encryption enabled (AWS default)
- **State**: Terraform-managed in `packages/infrastructure/terraform/modules/database/`

## Table Architecture

### Single-Table Design: `Pointly-UserLedger-{env}`

This is the primary table holding both Customers and Merchants using PK prefixes:

| PK Pattern | Entity Type | Description |
|------------|-------------|-------------|
| `CUSTOMER#<ulid>` | Customer | Customer profile + enrollment data |
| `MERCHANT#<id>` | Merchant | Merchant profile + configuration |
| `MERCHANT#<id>#CUSTOMER#<ulid>` | Enrollment | Customer enrolled at merchant |
| `MERCHANT#<id>#TRANSACTION#<ulid>` | Transaction | Purchase/redeem record |
| `MERCHANT#<id>#CAMPAIGN#<ulid>` | Campaign | Marketing campaign |
| `MERCHANT#<id>#CONSENT#<ulid>` | Consent | Customer consent record |

**CRITICAL**: Never split this into separate tables. The single-table design enables efficient merchant-scoped queries.

### Dedicated Tables

| Table | PK | SK | Purpose |
|-------|----|----|----|
| `Pointly-TransactionAudit-{env}` | `TXN#<ulid>` | — | Global transaction audit log |
| `Pointly-Idempotency-{env}` | `IDEM#<key>` | — | Dedup keys with TTL |
| `Pointly-QRNonce-{env}` | `QR#<nonce>` | — | QR code validation (short TTL) |
| `Pointly-PendingConsents-{env}` | `CONSENT#<id>` | — | Consent approval queue |
| `Pointly-SMSQuota-{env}` | `QUOTA#<merchantId>` | — | Per-merchant SMS usage tracking |
| `Pointly-WalletPasses-{env}` | `PASS#<customerId>` | — | Apple/Google Wallet data |

## Common Query Patterns

### Get Customer by Phone
```typescript
// GSI: phone-index (phone → PK)
query({
  IndexName: 'phone-index',
  KeyConditionExpression: 'phone = :phone',
  ExpressionAttributeValues: { ':phone': e164Phone },
})
```

### Get Merchant's Customers
```typescript
// Query by PK prefix
query({
  KeyConditionExpression: 'begins_with(PK, :prefix)',
  ExpressionAttributeValues: { ':prefix': `MERCHANT#${merchantId}#CUSTOMER#` },
})
```

### Get Customer's Transactions at Merchant
```typescript
// Query by PK prefix with sort key
query({
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
  ExpressionAttributeValues: {
    ':pk': `MERCHANT#${merchantId}#CUSTOMER#${customerId}`,
    ':skPrefix': 'TRANSACTION#',
  },
})
```

### Get Active Campaigns for Merchant
```typescript
// GSI: campaign-status-index (merchantId + isActive)
query({
  IndexName: 'campaign-status-index',
  KeyConditionExpression: 'merchantId = :mid AND isActive = :active',
  ExpressionAttributeValues: { ':mid': merchantId, ':active': true },
})
```

## GSIs (Global Secondary Indexes)

| Index Name | Table | Partition Key | Sort Key | Purpose |
|------------|-------|--------------|----------|---------|
| `phone-index` | UserLedger | `phone` | — | Lookup customer by phone |
| `campaign-status-index` | UserLedger | `merchantId` | `isActive` | Filter campaigns by status |
| `transaction-date-index` | TransactionAudit | `merchantId` | `createdAt` | Query transactions by date range |

## Performance Optimization

### Query Best Practices
1. **Always use partition key** — never scan without PK
2. **Use FilterExpression sparingly** — it reads all matching items before filtering
3. **Use ProjectionExpression** — limit data transfer to needed attributes
4. **Batch operations** — use `batchGet` for up to 100 items, `batchWrite` for up to 25
5. **Parallel queries** — use `Promise.all` for independent queries

### Avoid These Anti-Patterns
- ❌ `scan()` without filter (full table scan)
- ❌ N+1 query patterns (query in loop)
- ❌ Storing large blobs in DynamoDB (use S3 instead)
- ❌ Hot partitions (sequential ULIDs can cause this — use random prefix)
- ❌ Missing TTL on transient data (idempotency keys, QR nonces)

### Capacity Planning
- On-demand mode auto-scales — no manual provisioning needed
- Monitor `ThrottledRequests` metric in CloudWatch
- If throttling occurs, consider:
  - Adding/restructuring GSIs
  - Using batch operations
  - Implementing caching layer

## TTL Configuration

| Table | TTL Attribute | TTL Value | Purpose |
|-------|--------------|-----------|---------|
| Idempotency | `expiresAt` | 24 hours | Prevent key accumulation |
| QRNonce | `expiresAt` | 5 minutes | Short-lived validation tokens |

## Common Operations

### Create Customer
```typescript
// 1. Check if phone exists (GSI query)
// 2. Generate ULID for customerId
// 3. Write customer item with PK = CUSTOMER#<ulid>
// 4. Write enrollment item with PK = MERCHANT#<id>#CUSTOMER#<ulid>
// Use TransactionalWriter for atomic multi-item write
```

### Record Purchase
```typescript
// 1. Check idempotency key
// 2. Get customer enrollment
// 3. Calculate points (tier multiplier, campaign bonus)
// 4. Update customer points balance
// 5. Write transaction audit record
// 6. Delete idempotency key
// Use TransactionalWriter for steps 3-5
```

### Update Campaign
```typescript
// 1. Get campaign by PK
// 2. Validate updates (multiplier range, date range)
// 3. Update item with conditional expression
// 4. Return updated campaign
```

## Gotchas

1. **ULID ordering**: ULIDs are time-ordered, which can cause hot partitions if used as sort key. Add random prefix if needed.
2. **Case sensitivity**: DynamoDB string comparisons are case-sensitive. Normalize phone numbers and IDs.
3. **Number precision**: DynamoDB stores numbers as arbitrary precision. JavaScript Number has 53-bit precision limit.
4. **Empty strings**: DynamoDB doesn't support empty strings. Use `null` or omit the attribute.
5. **TTL deletion**: TTL deletion is eventual, not immediate. Items may persist briefly after expiry.
