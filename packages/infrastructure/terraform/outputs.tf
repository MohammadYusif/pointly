# Auth
output "merchant_user_pool_id" {
  value = module.auth.merchant_user_pool_id
}

output "merchant_user_pool_client_id" {
  value = module.auth.merchant_user_pool_client_id
}

output "customer_user_pool_id" {
  value = module.auth.customer_user_pool_id
}

output "customer_user_pool_client_id" {
  value = module.auth.customer_user_pool_client_id
}

# API
output "api_url" {
  value = module.api.api_url
}

output "api_cdn_distribution_id" {
  description = "CloudFront distribution ID for api.<domain> (empty if no custom domain)"
  value       = module.api.api_cdn_distribution_id
}

output "lambda_function_name" {
  value = module.api.lambda_function_name
}

output "sms_queue_url" {
  value = module.api.sms_queue_url
}

# Frontend
output "dashboard_bucket_name" {
  value = module.frontend.bucket_name
}

output "distribution_id" {
  value = module.frontend.distribution_id
}

output "dashboard_url" {
  value = module.frontend.dashboard_url
}

# Monitoring
output "alarm_topic_arn" {
  value = module.monitoring.alarm_topic_arn
}

output "dashboard_monitoring_url" {
  value = module.monitoring.dashboard_url
}

# Scheduled Lambdas (empty if not deployed)
output "decay_function_name" {
  value = module.api.decay_lambda_function_name
}

output "tier_reset_function_name" {
  value = module.api.tier_reset_lambda_function_name
}

# Customer Portal
output "customer_portal_bucket_name" {
  value = module.customer_portal.bucket_name
}

output "customer_portal_distribution_id" {
  value = module.customer_portal.distribution_id
}

output "customer_portal_url" {
  value = module.customer_portal.portal_url
}

# Landing
output "landing_bucket_name" {
  value = module.landing.bucket_name
}

output "landing_distribution_id" {
  value = module.landing.distribution_id
}

output "landing_url" {
  value = module.landing.landing_url
}
