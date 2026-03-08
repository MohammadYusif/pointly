locals {
  is_prod         = var.environment == "prod"
  has_domain      = var.domain_name != ""
  has_certificate = var.certificate_arn != ""
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ===========================================
# S3 Bucket for Static Website
# ===========================================
resource "aws_s3_bucket" "dashboard" {
  bucket = "pointly-merchant-dashboard-${var.environment}-${data.aws_caller_identity.current.account_id}"

  force_destroy = !local.is_prod
}

resource "aws_s3_bucket_public_access_block" "dashboard" {
  bucket = aws_s3_bucket.dashboard.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dashboard" {
  bucket = aws_s3_bucket.dashboard.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "dashboard" {
  bucket = aws_s3_bucket.dashboard.id

  versioning_configuration {
    status = local.is_prod ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_cors_configuration" "dashboard" {
  bucket = aws_s3_bucket.dashboard.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}


# ===========================================
# CloudFront Origin Access Control
# ===========================================
resource "aws_cloudfront_origin_access_control" "dashboard" {
  name                              = "Pointly-MerchantDashboard-OAC-${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ===========================================
# CloudFront Response Headers Policy
# ===========================================
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "Pointly-SecurityHeaders-${var.environment}"

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${var.api_url} https://cognito-idp.me-south-1.amazonaws.com; frame-ancestors 'none'"
      override                = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      protection = true
      mode_block = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Environment"
      value    = var.environment
      override = true
    }
  }
}

# ===========================================
# CloudFront Function for SPA URL Rewriting
# ===========================================
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "Pointly-UrlRewrite-${var.environment}"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.includes('.')) {
        request.uri += '.html';
      }
      return request;
    }
  EOF
}

# ===========================================
# CloudFront Cache Policies
# ===========================================
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "Pointly-StaticAssets-${var.environment}"
  default_ttl = 31536000 # 365 days
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# ===========================================
# CloudFront Distribution
# ===========================================
resource "aws_cloudfront_distribution" "dashboard" {
  comment             = "Pointly Merchant Dashboard - ${var.environment}"
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  http_version        = "http2and3"

  aliases = local.has_domain ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.dashboard.bucket_regional_domain_name
    origin_id                = "S3-Dashboard"
    origin_access_control_id = aws_cloudfront_origin_access_control.dashboard.id
  }

  # Default behavior
  default_cache_behavior {
    target_origin_id           = "S3-Dashboard"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    compress                   = true
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # Static assets — long cache
  ordered_cache_behavior {
    path_pattern               = "/_next/static/*"
    target_origin_id           = "S3-Dashboard"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # API passthrough — no cache
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "S3-Dashboard"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # SPA error handling
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  # TLS
  viewer_certificate {
    cloudfront_default_certificate = !local.has_certificate
    acm_certificate_arn            = local.has_certificate ? var.certificate_arn : null
    ssl_support_method             = local.has_certificate ? "sni-only" : null
    minimum_protocol_version       = local.has_certificate ? "TLSv1.2_2021" : "TLSv1"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ===========================================
# S3 Bucket Policy — allow CloudFront OAC
# ===========================================
resource "aws_s3_bucket_policy" "dashboard" {
  bucket = aws_s3_bucket.dashboard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.dashboard.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.dashboard.arn
          }
        }
      }
    ]
  })
}
