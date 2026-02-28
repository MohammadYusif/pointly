variable "environment" {
  type = string
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Custom domain for the landing page (e.g. pointly.sa)"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN (must be in us-east-1 for CloudFront)"
}
