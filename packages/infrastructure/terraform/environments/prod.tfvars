environment                     = "prod"
aws_region                      = "eu-west-1"
alarm_email                     = ""
domain_name                     = ""
certificate_arn                 = ""
decay_lambda_function_name      = ""
tier_reset_lambda_function_name = ""

# SMS — set via TF_VAR_sms_provider_api_key in CI secrets
sms_sender_id = "POINTLY"

# Moyasar — set via TF_VAR_moyasar_secret_key / TF_VAR_moyasar_webhook_secret in CI secrets

# Observability
sentry_dsn = "https://68e35dfc10c1e29f23a747445d2b66f9@o4511379778699264.ingest.de.sentry.io/4511379790364752"
