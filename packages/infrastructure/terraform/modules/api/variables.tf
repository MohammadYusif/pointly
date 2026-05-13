variable "environment" {
  type = string
}

variable "lambda_zip_path" {
  type = string
}

variable "lambda_decay_zip_path" {
  type    = string
  default = ""
}

variable "lambda_tier_reset_zip_path" {
  type    = string
  default = ""
}

variable "lambda_sms_consumer_zip_path" {
  description = "Path to the SMS consumer Lambda zip file"
  type        = string
  default     = "lambda-sms-consumer.zip"
}

# Cognito
variable "merchant_user_pool_id" {
  type = string
}

variable "merchant_user_pool_client_id" {
  type = string
}

variable "customer_user_pool_id" {
  type = string
}

variable "customer_user_pool_client_id" {
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

# SMS Provider (Taqnyat)
variable "sms_provider_api_key" {
  description = "Taqnyat API key for SMS delivery"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sms_sender_id" {
  description = "SMS sender ID (must be pre-approved by Taqnyat)"
  type        = string
  default     = "POINTLY"
}

# Moyasar (payment gateway)
variable "moyasar_secret_key" {
  description = "Moyasar secret API key for invoice creation and status checks"
  type        = string
  sensitive   = true
  default     = ""
}

variable "moyasar_webhook_secret" {
  description = "Moyasar webhook HMAC secret for signature verification"
  type        = string
  sensitive   = true
  default     = ""
}

# Merchant Cognito User Pool ARN (for AdminCreateUser IAM policy)
variable "merchant_user_pool_arn" {
  description = "ARN of the merchant Cognito User Pool (used to grant AdminCreateUser access)"
  type        = string
  default     = ""
}

# Custom domain / CloudFront
variable "domain_name" {
  description = "Root domain (e.g. pointly.sa). API is served at api.<domain>. Empty = no CloudFront distribution."
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1 for CloudFront). Empty = no CloudFront distribution."
  type        = string
  default     = ""
}


variable "sentry_dsn" {
  description = "Sentry DSN for the API Lambda functions. Safe to commit — DSN is not a secret."
  type        = string
  default     = ""
}
