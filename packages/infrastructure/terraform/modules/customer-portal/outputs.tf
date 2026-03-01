output "bucket_name" {
  value = aws_s3_bucket.portal.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.portal.arn
}

output "distribution_id" {
  value = aws_cloudfront_distribution.portal.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.portal.domain_name
}

output "portal_url" {
  value = local.has_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.portal.domain_name}"
}
