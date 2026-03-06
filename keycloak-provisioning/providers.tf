terraform {
  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = "~> 5.5.0"
    }
  }
}

variable "keycloak_admin_username" {
  type    = string
  default = "admin"
}

variable "keycloak_admin_password" {
  type    = string
  default = "admin"
}

variable "keycloak_url" {
  type    = string
  default = "http://keycloak:11000"
}

provider "keycloak" {
  client_id = "admin-cli"
  username  = var.keycloak_admin_username
  password  = var.keycloak_admin_password
  url       = var.keycloak_url
}
