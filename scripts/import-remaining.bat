@echo off
set TF_VAR_environment=dev
set TF=C:\Users\Psycho\.tfenv\versions\1.14.5\terraform.exe
set DIR=C:\Users\Psycho\Desktop\pointly\packages\infrastructure\terraform

echo === Importing remaining S3 Buckets ===
%TF% -chdir=%DIR% import module.frontend.aws_s3_bucket.dashboard pointly-merchant-dashboard-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful" /C:"Refreshing"
%TF% -chdir=%DIR% import module.landing.aws_s3_bucket.landing pointly-landing-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful" /C:"Refreshing"
%TF% -chdir=%DIR% import module.customer_portal.aws_s3_bucket.portal pointly-customer-portal-dev-759316130972 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful" /C:"Refreshing"

echo === Importing customer_portal resources ===
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_origin_access_control.portal E1QA7Z2A18BSSS 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_distribution.portal E1VCE01IMGWOBM 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"

echo === Importing CloudFront cache policies and response headers ===
%TF% -chdir=%DIR% import module.frontend.aws_cloudfront_cache_policy.static_assets Pointly-StaticAssets-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"
%TF% -chdir=%DIR% import module.landing.aws_cloudfront_cache_policy.landing_static Pointly-LandingStaticAssets-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"
%TF% -chdir=%DIR% import module.landing.aws_cloudfront_response_headers_policy.landing_security Pointly-LandingSecurityHeaders-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_cache_policy.static_assets Pointly-CustomerPortalStaticAssets-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"
%TF% -chdir=%DIR% import module.customer_portal.aws_cloudfront_response_headers_policy.security Pointly-CustomerPortalSecurityHeaders-dev 2>&1 | findstr /C:"Import" /C:"Error" /C:"prepared" /C:"successful"

echo === Done ===
