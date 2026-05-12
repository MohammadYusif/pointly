@echo off
set TF_VAR_environment=dev
set TF=C:\Users\Psycho\.tfenv\versions\1.14.5\terraform.exe
set DIR=C:\Users\Psycho\Desktop\pointly\packages\infrastructure\terraform

echo === Importing CloudFront OACs ===
%TF% -chdir=%DIR% import module.frontend.aws_cloudfront_origin_access_control.dashboard EXFTWNHUTLL42 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.landing.aws_cloudfront_origin_access_control.landing EK3JAQ696QDL6 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_origin_access_control.customer_portal E1QA7Z2A18BSSS 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"

echo === Importing CloudFront Functions ===
%TF% -chdir=%DIR% import module.frontend.aws_cloudfront_function.url_rewrite Pointly-UrlRewrite-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_function.url_rewrite Pointly-CustomerPortal-UrlRewrite-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"

echo === Importing CloudFront Distributions ===
%TF% -chdir=%DIR% import module.frontend.aws_cloudfront_distribution.dashboard E2ZSJ88P7O7AKO 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.landing.aws_cloudfront_distribution.landing ENILGFVBZ6SSX 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_distribution.customer_portal E1VCE01IMGWOBM 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"

echo === Importing S3 Buckets ===
%TF% -chdir=%DIR% import module.frontend.aws_s3_bucket.dashboard pointly-merchant-dashboard-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.landing.aws_s3_bucket.landing pointly-landing-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"
%TF% -chdir=%DIR% import module.customer_portal.aws_s3_bucket.customer_portal pointly-customer-portal-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"

echo === Importing IAM Role ===
%TF% -chdir=%DIR% import module.auth.aws_iam_role.cognito_triggers pointly-cognito-triggers-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared"

echo === Done ===
