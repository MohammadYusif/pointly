terraform {
  backend "s3" {
    bucket         = "pointly-terraform-state-759316130972-eu"
    key            = "infrastructure/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "pointly-terraform-locks-eu"
    encrypt        = true
  }
}
