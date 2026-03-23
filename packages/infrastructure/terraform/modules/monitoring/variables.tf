variable "environment" {
  type = string
}

variable "api_gateway_name" {
  type = string
}

variable "api_gateway_id" {
  type = string
}

variable "lambda_function_name" {
  type = string
}

variable "dynamodb_table_names" {
  type = list(string)
}

variable "cloudfront_distribution_id" {
  type = string
}

variable "alarm_email" {
  type    = string
  default = ""
}

variable "sms_dlq_name" {
  description = "Name of the SMS Dead Letter Queue (for DLQ depth alarm)"
  type        = string
}

variable "decay_lambda_function_name" {
  description = "Name of the monthly decay Lambda function (for error alarm)"
  type        = string
}

variable "tier_reset_lambda_function_name" {
  description = "Name of the monthly tier-reset Lambda function (for error alarm)"
  type        = string
}
