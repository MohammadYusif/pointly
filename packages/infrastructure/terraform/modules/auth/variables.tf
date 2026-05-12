variable "environment" {
  type = string
}

# SMS Provider (Taqnyat) — passed to CreateAuthChallenge Lambda for OTP delivery
variable "sms_provider_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "sms_sender_id" {
  type    = string
  default = "POINTLY"
}
