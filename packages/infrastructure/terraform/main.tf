locals {
  is_prod = var.environment == "prod"
}

# ===========================================
# Auth — Cognito User Pools
# ===========================================
module "auth" {
  source      = "./modules/auth"
  environment = var.environment
}

# ===========================================
# Database — DynamoDB Tables
# ===========================================
module "database" {
  source      = "./modules/database"
  environment = var.environment
}

# ===========================================
# API — Lambda + API Gateway + SQS
# ===========================================
module "api" {
  source      = "./modules/api"
  environment = var.environment

  lambda_zip_path            = var.lambda_zip_path
  lambda_decay_zip_path      = var.lambda_decay_zip_path
  lambda_tier_reset_zip_path = var.lambda_tier_reset_zip_path

  # DynamoDB table names
  user_ledger_table_name       = module.database.user_ledger_table_name
  transaction_audit_table_name = module.database.transaction_audit_table_name
  idempotency_table_name       = module.database.idempotency_table_name
  qr_nonce_table_name          = module.database.qr_nonce_table_name
  pending_consents_table_name  = module.database.pending_consents_table_name
  sms_quota_table_name         = module.database.sms_quota_table_name
  wallet_passes_table_name     = module.database.wallet_passes_table_name

  # Cognito
  merchant_user_pool_id        = module.auth.merchant_user_pool_id
  merchant_user_pool_client_id = module.auth.merchant_user_pool_client_id
  customer_user_pool_id        = module.auth.customer_user_pool_id

  # DynamoDB table ARNs
  user_ledger_table_arn       = module.database.user_ledger_table_arn
  transaction_audit_table_arn = module.database.transaction_audit_table_arn
  idempotency_table_arn       = module.database.idempotency_table_arn
  qr_nonce_table_arn          = module.database.qr_nonce_table_arn
  pending_consents_table_arn  = module.database.pending_consents_table_arn
  sms_quota_table_arn         = module.database.sms_quota_table_arn
  wallet_passes_table_arn     = module.database.wallet_passes_table_arn
}

# ===========================================
# Frontend — S3 + CloudFront
# ===========================================
module "frontend" {
  source      = "./modules/frontend"
  environment = var.environment

  api_url         = module.api.api_url
  domain_name     = var.domain_name != "" ? "merchant.${var.domain_name}" : ""
  certificate_arn = var.certificate_arn
}


# ===========================================
# Landing Page — S3 + CloudFront
# ===========================================
module "landing" {
  source      = "./modules/landing"
  environment = var.environment

  domain_name     = var.domain_name != "" ? var.domain_name : ""
  certificate_arn = var.certificate_arn
}

# ===========================================
# Customer Portal — S3 + CloudFront
# ===========================================
module "customer_portal" {
  source      = "./modules/customer-portal"
  environment = var.environment

  api_url         = module.api.api_url
  domain_name     = var.domain_name != "" ? "customer.${var.domain_name}" : ""
  certificate_arn = var.certificate_arn
}

# ===========================================
# Monitoring — CloudWatch Alarms + Dashboard
# ===========================================
module "monitoring" {
  source      = "./modules/monitoring"
  environment = var.environment

  api_gateway_name                = module.api.api_gateway_name
  api_gateway_id                  = module.api.api_gateway_id
  lambda_function_name            = module.api.lambda_function_name
  dynamodb_table_names            = module.database.all_table_names
  cloudfront_distribution_id      = module.frontend.distribution_id
  alarm_email                     = var.alarm_email
  sms_dlq_name                    = module.api.sms_dlq_name
  decay_lambda_function_name      = ""
  tier_reset_lambda_function_name = ""
}
