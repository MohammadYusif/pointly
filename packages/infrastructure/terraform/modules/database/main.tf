locals {
  is_prod = var.environment == "prod"
}

# ===========================================
# User Ledger Table
# ===========================================
resource "aws_dynamodb_table" "user_ledger" {
  name         = "Pointly-UserLedger-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "phone"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  attribute {
    name = "GSI3PK"
    type = "S"
  }

  attribute {
    name = "GSI3SK"
    type = "S"
  }

  attribute {
    name = "GSI4PK"
    type = "S"
  }

  attribute {
    name = "EntityType"
    type = "S"
  }

  global_secondary_index {
    name            = "EntityTypeIndex"
    hash_key        = "EntityType"
    range_key       = "PK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "PhoneIndex"
    hash_key        = "phone"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "MerchantCustomersIndex"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "TierIndex"
    hash_key        = "GSI4PK"
    projection_type = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = local.is_prod
  }

  server_side_encryption {
    enabled = true
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# Transaction Audit Table
# ===========================================
resource "aws_dynamodb_table" "transaction_audit" {
  name         = "Pointly-TransactionAudit-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  attribute {
    name = "GSI3PK"
    type = "S"
  }

  attribute {
    name = "GSI3SK"
    type = "S"
  }

  attribute {
    name = "GSI4PK"
    type = "S"
  }

  attribute {
    name = "GSI4SK"
    type = "S"
  }

  attribute {
    name = "GSI5PK"
    type = "S"
  }

  attribute {
    name = "GSI5SK"
    type = "S"
  }

  global_secondary_index {
    name            = "CustomerTransactionsIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "MerchantTransactionsIndex"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "IdempotencyIndex"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CustomerMerchantIndex"
    hash_key        = "GSI4PK"
    range_key       = "GSI4SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "LocationTransactionsIndex"
    hash_key        = "GSI5PK"
    range_key       = "GSI5SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# Idempotency Table
# ===========================================
resource "aws_dynamodb_table" "idempotency" {
  name         = "Pointly-Idempotency-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = local.is_prod
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# QR Nonce Table
# ===========================================
resource "aws_dynamodb_table" "qr_nonce" {
  name         = "Pointly-QRNonce-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jti"

  attribute {
    name = "jti"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = local.is_prod
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# Pending Consents Table
# ===========================================
resource "aws_dynamodb_table" "pending_consents" {
  name         = "Pointly-PendingConsents-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = local.is_prod
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# SMS Quota Table
# ===========================================
resource "aws_dynamodb_table" "sms_quota" {
  name         = "Pointly-SMSQuota-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "merchantId"
  range_key    = "month"

  attribute {
    name = "merchantId"
    type = "S"
  }

  attribute {
    name = "month"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = local.is_prod
  }

  deletion_protection_enabled = local.is_prod
}

# ===========================================
# Wallet Passes Table
# ===========================================
resource "aws_dynamodb_table" "wallet_passes" {
  name         = "Pointly-WalletPasses-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = local.is_prod
  }

  deletion_protection_enabled = local.is_prod
}
