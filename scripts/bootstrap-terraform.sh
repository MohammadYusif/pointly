#!/bin/bash
# Bootstrap Terraform state backend resources
# Run this ONCE before the first deployment
# Requires: AWS CLI configured with credentials for me-south-1

set -euo pipefail

AWS_REGION="me-south-1"
STATE_BUCKET="pointly-terraform-state-759316130972"
LOCK_TABLE="pointly-terraform-locks"

echo "=== Pointly Terraform Bootstrap ==="
echo "Region: $AWS_REGION"
echo ""

# 1. Create S3 bucket for state
echo "[1/3] Creating S3 state bucket: $STATE_BUCKET"
if aws s3api head-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  echo "  Bucket already exists, skipping."
else
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"

  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --region "$AWS_REGION" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --region "$AWS_REGION" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --region "$AWS_REGION" \
    --public-access-block-configuration '{
      "BlockPublicAcls": true,
      "IgnorePublicAcls": true,
      "BlockPublicPolicy": true,
      "RestrictPublicBuckets": true
    }'

  echo "  Created and configured."
fi

# 2. Create DynamoDB lock table
echo "[2/3] Creating DynamoDB lock table: $LOCK_TABLE"
if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" 2>/dev/null | grep -q "ACTIVE"; then
  echo "  Table already exists, skipping."
else
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --region "$AWS_REGION" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  echo "  Waiting for table to become active..."
  aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$AWS_REGION"
  echo "  Created."
fi

# 3. Verify
echo "[3/3] Verifying..."
aws s3api head-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION"
echo "  S3 bucket: OK"
aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" --query 'Table.TableStatus' --output text
echo "  DynamoDB table: OK"

echo ""
echo "=== Bootstrap complete! ==="
echo ""
echo "Next steps:"
echo "  1. Ensure these GitHub secrets are set:"
echo "     - AWS_ACCESS_KEY_ID"
echo "     - AWS_SECRET_ACCESS_KEY"
echo "  2. Push to main branch to trigger staging deployment"
echo "  3. After deployment, run: node scripts/seed-data.mjs"
