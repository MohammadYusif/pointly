locals {
  is_prod = var.environment == "prod"
}

# ===========================================
# Merchant User Pool
# ===========================================
resource "aws_cognito_user_pool" "merchant" {
  name = "Pointly-Merchants-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  deletion_protection = local.is_prod ? "ACTIVE" : "INACTIVE"

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "merchantId"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "businessName"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "tier"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "merchant_web" {
  name         = "Pointly-MerchantWeb-${var.environment}"
  user_pool_id = aws_cognito_user_pool.merchant.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  refresh_token_validity        = 30
  access_token_validity         = 1
  id_token_validity             = 1

  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }
}

# ===========================================
# Customer User Pool
# ===========================================
resource "aws_cognito_user_pool" "customer" {
  name = "Pointly-Customers-${var.environment}"

  username_attributes      = ["phone_number"]
  auto_verified_attributes = []

  deletion_protection = local.is_prod ? "ACTIVE" : "INACTIVE"

  password_policy {
    minimum_length                   = 6
    require_lowercase                = false
    require_uppercase                = false
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = false
  }

  schema {
    name                     = "phone_number"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "customerId"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 1
    }
  }

  lambda_config {
    pre_sign_up                    = aws_lambda_function.pre_sign_up.arn
    define_auth_challenge          = aws_lambda_function.define_auth_challenge.arn
    create_auth_challenge          = aws_lambda_function.create_auth_challenge.arn
    verify_auth_challenge_response = aws_lambda_function.verify_auth_challenge.arn
  }

  depends_on = [
    aws_lambda_function.pre_sign_up,
    aws_lambda_function.define_auth_challenge,
    aws_lambda_function.create_auth_challenge,
    aws_lambda_function.verify_auth_challenge,
  ]
}

resource "aws_cognito_user_pool_client" "customer_web" {
  name         = "Pointly-CustomerWeb-${var.environment}"
  user_pool_id = aws_cognito_user_pool.customer.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  refresh_token_validity        = 90
  access_token_validity         = 24
  id_token_validity             = 24

  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }
}

# ===========================================
# OTP Lambda Triggers (Customer CUSTOM_AUTH)
# ===========================================

resource "aws_iam_role" "cognito_triggers" {
  name = "pointly-cognito-triggers-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cognito_triggers_logs" {
  role       = aws_iam_role.cognito_triggers.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---- DefineAuthChallenge ----

data "archive_file" "define_auth_challenge" {
  type        = "zip"
  output_path = "${path.module}/define-auth-challenge.zip"
  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        const session = event.request.session;
        if (session.length === 0) {
          event.response.issueTokens = false;
          event.response.failAuthentication = false;
          event.response.challengeName = 'CUSTOM_CHALLENGE';
        } else if (
          session.length === 1 &&
          session[0].challengeName === 'CUSTOM_CHALLENGE' &&
          session[0].challengeResult === true
        ) {
          event.response.issueTokens = true;
          event.response.failAuthentication = false;
        } else {
          event.response.issueTokens = false;
          event.response.failAuthentication = true;
        }
        return event;
      };
    EOT
    filename = "index.js"
  }
}

resource "aws_cloudwatch_log_group" "define_auth_challenge" {
  name              = "/aws/lambda/pointly-define-auth-challenge-${var.environment}"
  retention_in_days = 7
}

resource "aws_lambda_function" "define_auth_challenge" {
  function_name    = "pointly-define-auth-challenge-${var.environment}"
  role             = aws_iam_role.cognito_triggers.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.define_auth_challenge.output_path
  source_code_hash = data.archive_file.define_auth_challenge.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.define_auth_challenge]
}

resource "aws_lambda_permission" "define_auth_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.define_auth_challenge.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.customer.arn
}

# ---- CreateAuthChallenge ----

data "archive_file" "create_auth_challenge" {
  type        = "zip"
  output_path = "${path.module}/create-auth-challenge.zip"
  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        console.log('[OTP] Phone: ' + event.request.userAttributes.phone_number + ' | Code: ' + otp);
        event.response.publicChallengeParameters = {
          phone: event.request.userAttributes.phone_number,
        };
        event.response.privateChallengeParameters = { answer: otp };
        event.response.challengeMetadata = 'OTP_CHALLENGE';
        return event;
      };
    EOT
    filename = "index.js"
  }
}

resource "aws_cloudwatch_log_group" "create_auth_challenge" {
  name              = "/aws/lambda/pointly-create-auth-challenge-${var.environment}"
  retention_in_days = 7
}

resource "aws_lambda_function" "create_auth_challenge" {
  function_name    = "pointly-create-auth-challenge-${var.environment}"
  role             = aws_iam_role.cognito_triggers.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.create_auth_challenge.output_path
  source_code_hash = data.archive_file.create_auth_challenge.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.create_auth_challenge]
}

resource "aws_lambda_permission" "create_auth_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_auth_challenge.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.customer.arn
}

# ---- VerifyAuthChallengeResponse ----

data "archive_file" "verify_auth_challenge" {
  type        = "zip"
  output_path = "${path.module}/verify-auth-challenge.zip"
  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        const expected = event.request.privateChallengeParameters.answer;
        const provided = event.request.challengeAnswer;
        event.response.answerCorrect = expected === provided;
        return event;
      };
    EOT
    filename = "index.js"
  }
}

resource "aws_cloudwatch_log_group" "verify_auth_challenge" {
  name              = "/aws/lambda/pointly-verify-auth-challenge-${var.environment}"
  retention_in_days = 7
}

resource "aws_lambda_function" "verify_auth_challenge" {
  function_name    = "pointly-verify-auth-challenge-${var.environment}"
  role             = aws_iam_role.cognito_triggers.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.verify_auth_challenge.output_path
  source_code_hash = data.archive_file.verify_auth_challenge.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.verify_auth_challenge]
}

resource "aws_lambda_permission" "verify_auth_challenge" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verify_auth_challenge.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.customer.arn
}

# ---- PreSignUp (auto-confirm new users so CUSTOM_AUTH works immediately) ----

data "archive_file" "pre_sign_up" {
  type        = "zip"
  output_path = "${path.module}/pre-sign-up.zip"
  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        event.response.autoConfirmUser = true;
        return event;
      };
    EOT
    filename = "index.js"
  }
}

resource "aws_cloudwatch_log_group" "pre_sign_up" {
  name              = "/aws/lambda/pointly-pre-sign-up-${var.environment}"
  retention_in_days = 7
}

resource "aws_lambda_function" "pre_sign_up" {
  function_name    = "pointly-pre-sign-up-${var.environment}"
  role             = aws_iam_role.cognito_triggers.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.pre_sign_up.output_path
  source_code_hash = data.archive_file.pre_sign_up.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.pre_sign_up]
}

resource "aws_lambda_permission" "pre_sign_up" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_sign_up.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.customer.arn
}
