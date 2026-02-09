output "merchant_user_pool_id" {
  value = aws_cognito_user_pool.merchant.id
}

output "merchant_user_pool_arn" {
  value = aws_cognito_user_pool.merchant.arn
}

output "merchant_user_pool_client_id" {
  value = aws_cognito_user_pool_client.merchant_web.id
}

output "customer_user_pool_id" {
  value = aws_cognito_user_pool.customer.id
}

output "customer_user_pool_arn" {
  value = aws_cognito_user_pool.customer.arn
}

output "customer_user_pool_client_id" {
  value = aws_cognito_user_pool_client.customer_web.id
}
