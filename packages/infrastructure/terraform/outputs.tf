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
