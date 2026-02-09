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
