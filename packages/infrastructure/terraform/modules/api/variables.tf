variable "environment" {
  type = string
}

variable "lambda_zip_path" {
  type = string
}

# DynamoDB table names
variable "user_ledger_table_name" {
  type = string
}

variable "transaction_audit_table_name" {
  type = string
}

variable "idempotency_table_name" {
  type = string
}

variable "qr_nonce_table_name" {
  type = string
}

variable "pending_consents_table_name" {
  type = string
}

variable "sms_quota_table_name" {
  type = string
}

variable "wallet_passes_table_name" {
  type = string
}

# DynamoDB table ARNs
variable "user_ledger_table_arn" {
  type = string
}

variable "transaction_audit_table_arn" {
  type = string
}

variable "idempotency_table_arn" {
  type = string
}

variable "qr_nonce_table_arn" {
  type = string
}

variable "pending_consents_table_arn" {
  type = string
}

variable "sms_quota_table_arn" {
  type = string
}

variable "wallet_passes_table_arn" {
  type = string
}

# Cognito
variable "merchant_user_pool_arn" {
  type = string
}

variable "customer_user_pool_arn" {
  type = string
}
