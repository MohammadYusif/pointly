provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Pointly"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
    }
  }
}
