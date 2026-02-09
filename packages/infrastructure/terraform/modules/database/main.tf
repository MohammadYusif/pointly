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

  global_secondary_index {
    name            = "PhoneIndex"
    hash_key        = "phone"
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
    name = "merchantId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "DateIndex"
    hash_key        = "merchantId"
    range_key       = "createdAt"
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

  server_side_encryption {
    enabled = true
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

  attribute {
    name = "passSerial"
    type = "S"
  }

  attribute {
    name = "customerId"
    type = "S"
  }

  global_secondary_index {
    name            = "SerialIndex"
    hash_key        = "passSerial"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CustomerIndex"
    hash_key        = "customerId"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  deletion_protection_enabled = local.is_prod
}
