output "api_url" {
  value = "${aws_api_gateway_stage.main.invoke_url}/"
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
