locals {
  is_prod        = var.environment == "prod"
  has_alarm_email = var.alarm_email != ""
}

data "aws_region" "current" {}

# ===========================================
# SNS Topic for Alarms
# ===========================================
resource "aws_sns_topic" "alarms" {
  name         = "Pointly-Alarms-${var.environment}"
  display_name = "Pointly System Alarms"
}

resource "aws_sns_topic_subscription" "email" {
  count     = local.has_alarm_email ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ===========================================
# API Gateway Alarms
# ===========================================
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "Pointly-API-5xxErrors-${var.environment}"
  alarm_description   = "API Gateway 5xx error rate is high"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5XXError"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  threshold           = local.is_prod ? 10 : 50
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = var.api_gateway_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_4xx" {
  alarm_name          = "Pointly-API-4xxErrors-${var.environment}"
  alarm_description   = "API Gateway 4xx error rate is high"
  namespace           = "AWS/ApiGateway"
  metric_name         = "4XXError"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  threshold           = local.is_prod ? 100 : 500
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = var.api_gateway_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "Pointly-API-HighLatency-${var.environment}"
  alarm_description   = "API Gateway average latency exceeds threshold"
  namespace           = "AWS/ApiGateway"
  metric_name         = "Latency"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = local.is_prod ? 500 : 1000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = var.api_gateway_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

# ===========================================
# Lambda Alarms
# ===========================================
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "Pointly-Lambda-${var.lambda_function_name}-Errors"
  alarm_description   = "Lambda function ${var.lambda_function_name} has errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = local.is_prod ? 5 : 20
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "Pointly-Lambda-${var.lambda_function_name}-Throttles"
  alarm_description   = "Lambda function ${var.lambda_function_name} is being throttled"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "Pointly-Lambda-${var.lambda_function_name}-Duration"
  alarm_description   = "Lambda function ${var.lambda_function_name} duration is high"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 10000 # 10 seconds
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

# ===========================================
# DynamoDB Alarms (per table)
# ===========================================
resource "aws_cloudwatch_metric_alarm" "dynamodb_user_errors" {
  for_each = toset(var.dynamodb_table_names)

  alarm_name          = "Pointly-DDB-${each.value}-UserErrors-${var.environment}"
  alarm_description   = "DynamoDB table ${each.value} has user errors"
  namespace           = "AWS/DynamoDB"
  metric_name         = "UserErrors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = each.value
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  for_each = toset(var.dynamodb_table_names)

  alarm_name          = "Pointly-DDB-${each.value}-Throttled-${var.environment}"
  alarm_description   = "DynamoDB table ${each.value} is being throttled"
  namespace           = "AWS/DynamoDB"
  metric_name         = "ThrottledRequests"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = each.value
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

# ===========================================
# CloudFront Alarms
# ===========================================
resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  alarm_name          = "Pointly-CloudFront-ErrorRate-${var.environment}"
  alarm_description   = "CloudFront error rate is high"
  namespace           = "AWS/CloudFront"
  metric_name         = "TotalErrorRate"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_rate" {
  alarm_name          = "Pointly-CloudFront-5xxRate-${var.environment}"
  alarm_description   = "CloudFront 5xx error rate is high"
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]
}

# ===========================================
# CloudWatch Dashboard
# ===========================================
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "Pointly-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      # API Gateway header
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "# API Gateway Metrics"
          }
        }
      ],
      # API Gateway metrics
      [
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 8
          height = 6
          properties = {
            title   = "API Requests"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/ApiGateway", "Count", "ApiName", var.api_gateway_name, { stat = "Sum", period = 60 }]
            ]
            view = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 1
          width  = 8
          height = 6
          properties = {
            title   = "API Latency (ms)"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/ApiGateway", "Latency", "ApiName", var.api_gateway_name, { stat = "Average", period = 60 }],
              ["AWS/ApiGateway", "Latency", "ApiName", var.api_gateway_name, { stat = "p99", period = 60 }]
            ]
            view = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 1
          width  = 8
          height = 6
          properties = {
            title   = "API Errors"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/ApiGateway", "4XXError", "ApiName", var.api_gateway_name, { stat = "Sum", period = 60 }],
              ["AWS/ApiGateway", "5XXError", "ApiName", var.api_gateway_name, { stat = "Sum", period = 60 }]
            ]
            view = "timeSeries"
          }
        }
      ],
      # Lambda header
      [
        {
          type   = "text"
          x      = 0
          y      = 7
          width  = 24
          height = 1
          properties = {
            markdown = "# Lambda Metrics"
          }
        }
      ],
      # Lambda metrics
      [
        {
          type   = "metric"
          x      = 0
          y      = 8
          width  = 6
          height = 6
          properties = {
            title   = "${var.lambda_function_name} - Invocations"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60 }]
            ]
            view = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 6
          y      = 8
          width  = 6
          height = 6
          properties = {
            title   = "${var.lambda_function_name} - Duration"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "Average", period = 60 }],
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p99", period = 60 }]
            ]
            view = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 8
          width  = 6
          height = 6
          properties = {
            title   = "${var.lambda_function_name} - Errors"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60 }]
            ]
            view = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 18
          y      = 8
          width  = 6
          height = 6
          properties = {
            title   = "${var.lambda_function_name} - Concurrent"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", var.lambda_function_name, { stat = "Maximum", period = 60 }]
            ]
            view = "timeSeries"
          }
        }
      ],
      # DynamoDB header
      [
        {
          type   = "text"
          x      = 0
          y      = 14
          width  = 24
          height = 1
          properties = {
            markdown = "# DynamoDB Metrics"
          }
        }
      ],
      # DynamoDB metrics (first 3 tables)
      [
        for i, table_name in slice(var.dynamodb_table_names, 0, min(3, length(var.dynamodb_table_names))) :
        {
          type   = "metric"
          x      = 0
          y      = 15 + (i * 6)
          width  = 12
          height = 6
          properties = {
            title   = "${table_name} - Consumed RCU/WCU"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", table_name, { stat = "Sum", period = 60 }],
              ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", table_name, { stat = "Sum", period = 60 }]
            ]
            view = "timeSeries"
          }
        }
      ],
      [
        for i, table_name in slice(var.dynamodb_table_names, 0, min(3, length(var.dynamodb_table_names))) :
        {
          type   = "metric"
          x      = 12
          y      = 15 + (i * 6)
          width  = 12
          height = 6
          properties = {
            title   = "${table_name} - Latency"
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", table_name, "Operation", "GetItem", { stat = "Average", period = 60 }],
              ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", table_name, "Operation", "Query", { stat = "Average", period = 60 }]
            ]
            view = "timeSeries"
          }
        }
      ]
    )
  })
}
