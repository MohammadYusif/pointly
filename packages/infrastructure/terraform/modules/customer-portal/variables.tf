variable "environment" {
  type = string
}

variable "api_url" {
  type = string
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Custom domain for the customer portal (e.g. customer.pointly.sa)"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN (must be in us-east-1 for CloudFront)"
}
