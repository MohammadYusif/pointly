terraform {
  backend "s3" {
    bucket         = "pointly-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "me-south-1"
    dynamodb_table = "pointly-terraform-locks"
    encrypt        = true
  }
}
