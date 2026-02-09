terraform {
  backend "s3" {
    bucket         = "pointly-terraform-state-759316130972"
    key            = "infrastructure/terraform.tfstate"
    region         = "me-south-1"
    dynamodb_table = "pointly-terraform-locks"
    encrypt        = true
  }
}
