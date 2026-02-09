variable "aws_region" {
  type    = string
  default = "me-south-1"
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
  default     = "../../../apps/api/lambda.zip"
  description = "Path to the pre-built Lambda deployment zip"
}
