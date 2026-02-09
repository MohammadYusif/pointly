output "user_ledger_table_name" {
  value = aws_dynamodb_table.user_ledger.name
}

output "user_ledger_table_arn" {
  value = aws_dynamodb_table.user_ledger.arn
}

output "transaction_audit_table_name" {
  value = aws_dynamodb_table.transaction_audit.name
}

output "transaction_audit_table_arn" {
  value = aws_dynamodb_table.transaction_audit.arn
}

output "idempotency_table_name" {
  value = aws_dynamodb_table.idempotency.name
}

output "idempotency_table_arn" {
  value = aws_dynamodb_table.idempotency.arn
}

output "qr_nonce_table_name" {
  value = aws_dynamodb_table.qr_nonce.name
}

output "qr_nonce_table_arn" {
  value = aws_dynamodb_table.qr_nonce.arn
}

output "pending_consents_table_name" {
  value = aws_dynamodb_table.pending_consents.name
}

output "pending_consents_table_arn" {
  value = aws_dynamodb_table.pending_consents.arn
}

output "sms_quota_table_name" {
  value = aws_dynamodb_table.sms_quota.name
}

output "sms_quota_table_arn" {
  value = aws_dynamodb_table.sms_quota.arn
}

output "wallet_passes_table_name" {
  value = aws_dynamodb_table.wallet_passes.name
}

output "wallet_passes_table_arn" {
  value = aws_dynamodb_table.wallet_passes.arn
}

output "all_table_names" {
  value = [
    aws_dynamodb_table.user_ledger.name,
    aws_dynamodb_table.transaction_audit.name,
    aws_dynamodb_table.idempotency.name,
    aws_dynamodb_table.qr_nonce.name,
    aws_dynamodb_table.pending_consents.name,
    aws_dynamodb_table.sms_quota.name,
    aws_dynamodb_table.wallet_passes.name,
  ]
}
