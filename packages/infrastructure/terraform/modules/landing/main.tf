locals {
  is_prod         = var.environment == "prod"
  has_domain      = var.domain_name != ""
  has_certificate = var.certificate_arn != ""
}

data "aws_caller_identity" "current" {}

# ===========================================
# S3 Bucket for Landing Page
# ===========================================
resource "aws_s3_bucket" "landing" {
  bucket = "pointly-landing-${var.environment}-${data.aws_caller_identity.current.account_id}-eu"

  force_destroy = !local.is_prod
}

resource "aws_s3_bucket_public_access_block" "landing" {
  bucket = aws_s3_bucket.landing.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "landing" {
  bucket = aws_s3_bucket.landing.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "landing" {
  bucket = aws_s3_bucket.landing.id

  versioning_configuration {
    status = local.is_prod ? "Enabled" : "Suspended"
  }
}

# ===========================================
# CloudFront Origin Access Control
# ===========================================
resource "aws_cloudfront_origin_access_control" "landing" {
  name                              = "Pointly-Landing-OAC-${var.environment}-eu"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ===========================================
# CloudFront Response Headers Policy
# ===========================================
resource "aws_cloudfront_response_headers_policy" "landing_security" {
  name = "Pointly-LandingSecurityHeaders-${var.environment}-eu"

  security_headers_config {
    content_security_policy {
      # Landing page: self-hosted fonts (Next.js bundles them at build time), no external API calls
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-ancestors 'none'"
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
# CloudFront Cache Policy — Static Assets
# ===========================================
resource "aws_cloudfront_cache_policy" "landing_static" {
  name        = "Pointly-LandingStaticAssets-${var.environment}-eu"
  default_ttl = 31536000
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
resource "aws_cloudfront_distribution" "landing" {
  comment             = "Pointly Landing Page - ${var.environment}"
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  http_version        = "http2and3"

  aliases = local.has_domain ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.landing.bucket_regional_domain_name
    origin_id                = "S3-Landing"
    origin_access_control_id = aws_cloudfront_origin_access_control.landing.id
  }

  # Default behavior
  default_cache_behavior {
    target_origin_id           = "S3-Landing"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    compress                   = true
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.landing_security.id
  }

  # Next.js static assets — immutable, max cache
  ordered_cache_behavior {
    path_pattern               = "/_next/static/*"
    target_origin_id           = "S3-Landing"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.landing_static.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.landing_security.id
  }

  # 404 → index.html (single-page app fallback)
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
resource "aws_s3_bucket_policy" "landing" {
  bucket = aws_s3_bucket.landing.id

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
        Resource = "${aws_s3_bucket.landing.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.landing.arn
          }
        }
      }
    ]
  })
}
