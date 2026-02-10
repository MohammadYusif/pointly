locals {
  is_prod = var.environment == "prod"
  table_arns = [
    var.user_ledger_table_arn,
    var.transaction_audit_table_arn,
    var.idempotency_table_arn,
    var.qr_nonce_table_arn,
    var.pending_consents_table_arn,
    var.sms_quota_table_arn,
    var.wallet_passes_table_arn,
  ]
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ===========================================
# SQS Queue for SMS Notifications
# ===========================================
resource "aws_sqs_queue" "sms_dlq" {
  name                      = "Pointly-SMSQueue-DLQ-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "sms" {
  name                       = "Pointly-SMSQueue-${var.environment}"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600 # 14 days
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sms_dlq.arn
    maxReceiveCount     = 3
  })
}

# ===========================================
# IAM Role for Lambda
# ===========================================
resource "aws_iam_role" "lambda_exec" {
  name = "Pointly-ApiLambda-Role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "dynamodb_access" {
  name = "DynamoDBAccess"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem",
        ]
        Resource = concat(
          local.table_arns,
          [for arn in local.table_arns : "${arn}/index/*"]
        )
      }
    ]
  })
}

resource "aws_iam_role_policy" "sqs_send" {
  name = "SQSSendMessage"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.sms.arn
      }
    ]
  })
}

# ===========================================
# CloudWatch Log Groups
# ===========================================
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/Pointly-Api-${var.environment}"
  retention_in_days = local.is_prod ? 90 : 7
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/Pointly-API-${var.environment}"
  retention_in_days = local.is_prod ? 90 : 7
}

# ===========================================
# Lambda Function
# ===========================================
resource "aws_lambda_function" "api" {
  function_name = "Pointly-Api-${var.environment}"
  description   = "Pointly API - Main handler for all API requests"

  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn

  timeout     = 30
  memory_size = local.is_prod ? 1024 : 512

  reserved_concurrent_executions = -1

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      NODE_ENV                            = local.is_prod ? "production" : "development"
      ENVIRONMENT                         = var.environment
      USER_LEDGER_TABLE                   = var.user_ledger_table_name
      TRANSACTION_TABLE                   = var.transaction_audit_table_name
      IDEMPOTENCY_TABLE                   = var.idempotency_table_name
      QR_NONCE_TABLE                      = var.qr_nonce_table_name
      PENDING_CONSENTS_TABLE              = var.pending_consents_table_name
      SMS_QUOTA_TABLE                     = var.sms_quota_table_name
      WALLET_PASSES_TABLE                 = var.wallet_passes_table_name
      SMS_QUEUE_URL                       = aws_sqs_queue.sms.url
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
      LOG_LEVEL                           = local.is_prod ? "info" : "debug"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic,
  ]
}

# ===========================================
# API Gateway REST API
# ===========================================
resource "aws_api_gateway_rest_api" "main" {
  name        = "Pointly-API-${var.environment}"
  description = "Pointly Loyalty Platform API"

  binary_media_types = [
    "application/octet-stream",
    "image/*",
  ]

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Cognito Authorizers
resource "aws_api_gateway_authorizer" "merchant" {
  name            = "Pointly-MerchantAuth-${var.environment}"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"
  provider_arns   = [var.merchant_user_pool_arn]
}

resource "aws_api_gateway_authorizer" "customer" {
  name            = "Pointly-CustomerAuth-${var.environment}"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"
  provider_arns   = [var.customer_user_pool_arn]
}

# {proxy+} greedy resource — all routes proxied to Lambda
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# Root ANY method (for /)
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_rest_api.main.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_rest_api.main.root_resource_id
  http_method             = aws_api_gateway_method.root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# CORS: OPTIONS for {proxy+}
resource "aws_api_gateway_method" "proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = aws_api_gateway_method_response.proxy_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Api-Key,X-Amz-Date,X-Amz-Security-Token,X-Request-Id,X-Idempotency-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,PATCH,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = local.is_prod ? "'https://pointly.sa'" : "'*'"
  }

  depends_on = [aws_api_gateway_integration.proxy_options]
}

# ===========================================
# API Gateway CloudWatch Logging Role
# ===========================================
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "Pointly-APIGateway-CloudWatch-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn

  depends_on = [aws_iam_role_policy_attachment.api_gateway_cloudwatch]
}

# ===========================================
# API Gateway Deployment & Stage
# ===========================================
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.proxy.id,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.root.id,
      aws_api_gateway_method.proxy_options.id,
      aws_api_gateway_integration.proxy_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  xray_tracing_enabled = true

  depends_on = [aws_api_gateway_account.main]

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    throttling_rate_limit  = local.is_prod ? 5000 : 1000
    throttling_burst_limit = local.is_prod ? 10000 : 2000
  }
}

# ===========================================
# Lambda Permission for API Gateway
# ===========================================
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
