output "api_url" {
  description = "Public API base URL — CloudFront when domain_name is set, raw API Gateway otherwise"
  value       = local.has_api_domain ? "https://api.${var.domain_name}/" : "${aws_api_gateway_stage.main.invoke_url}/"
}

output "api_cdn_distribution_id" {
  description = "CloudFront distribution ID for the API (empty string if no custom domain configured)"
  value       = try(aws_cloudfront_distribution.api[0].id, "")
}

output "api_gateway_name" {
  value = aws_api_gateway_rest_api.main.name
}

output "api_gateway_id" {
  value = aws_api_gateway_rest_api.main.id
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.api.arn
}

output "sms_queue_url" {
  value = aws_sqs_queue.sms.url
}

output "decay_lambda_function_name" {
  value = try(aws_lambda_function.decay[0].function_name, "")
}

output "tier_reset_lambda_function_name" {
  value = try(aws_lambda_function.tier_reset[0].function_name, "")
}

output "waf_web_acl_arn" {
  description = "ARN of the WAFv2 Web ACL protecting the API"
  value       = aws_wafv2_web_acl.api.arn
}

output "sms_consumer_lambda_function_name" {
  description = "Name of the SMS consumer Lambda function"
  value       = try(aws_lambda_function.sms_consumer[0].function_name, "")
}

output "sms_dlq_name" {
  description = "Name of the SMS Dead Letter Queue"
  value       = aws_sqs_queue.sms_dlq.name
}
