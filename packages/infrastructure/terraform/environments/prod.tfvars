environment                     = "prod"
aws_region                      = "eu-west-1"
alarm_email                     = ""
domain_name                     = ""
certificate_arn                 = ""
decay_lambda_function_name      = ""
tier_reset_lambda_function_name = ""

# SMS — set via TF_VAR_sms_provider_api_key in CI secrets
sms_sender_id = "POINTLY"
