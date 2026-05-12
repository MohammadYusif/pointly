variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "environment" {
  type        = string
  description = "Environment name: dev or prod"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be dev or prod."
  }
}

variable "alarm_email" {
  type        = string
  default     = ""
  description = "Email address for CloudWatch alarm notifications"
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Custom domain (e.g. pointly.sa). Merchant dashboard uses merchant.<domain>"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN for custom domain (must be in us-east-1 for CloudFront)"
}

variable "lambda_zip_path" {
  type        = string
  default     = "../../../apps/api/dist/lambda/lambda.zip"
  description = "Path to the pre-built Lambda deployment zip"
}

variable "lambda_decay_zip_path" {
  type        = string
  default     = ""
  description = "Path to the pre-built decay Lambda deployment zip. Empty = skip deployment."
}

variable "lambda_tier_reset_zip_path" {
  type        = string
  default     = ""
  description = "Path to the pre-built tier reset Lambda deployment zip. Empty = skip deployment."
}

variable "decay_lambda_function_name" {
  type        = string
  default     = ""
  description = "Override name of decay Lambda for monitoring alarms. Auto-detected if empty."
}

variable "tier_reset_lambda_function_name" {
  type        = string
  default     = ""
  description = "Override name of tier-reset Lambda for monitoring alarms. Auto-detected if empty."
}

# SMS Provider (Taqnyat)
variable "sms_provider_api_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Taqnyat API key for SMS delivery. Set via TF_VAR_sms_provider_api_key in CI."
}

variable "sms_sender_id" {
  type        = string
  default     = "POINTLY"
  description = "SMS sender ID — must be pre-approved by Taqnyat / Saudi telecom."
}

variable "moyasar_secret_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Moyasar secret key for invoice creation. Set via TF_VAR_moyasar_secret_key in CI."
}

variable "moyasar_webhook_secret" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Moyasar webhook HMAC secret. Set via TF_VAR_moyasar_webhook_secret in CI."
}
