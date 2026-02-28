output "bucket_name" {
  value = aws_s3_bucket.landing.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.landing.arn
}

output "distribution_id" {
  value = aws_cloudfront_distribution.landing.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.landing.domain_name
}

output "landing_url" {
  value = local.has_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.landing.domain_name}"
}
