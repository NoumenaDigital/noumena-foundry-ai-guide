variable "default_password" {
  type    = string
  default = "welcome"
}

variable "app_name" {
  type    = string
  default = "sampleapp"
}

variable "frontend_port" {
  type    = string
  default = "5173"
}

variable "login_theme" {
  type    = string
  default = "sampleapp"
}

resource "keycloak_realm" "realm" {
  realm                    = var.app_name
  ssl_required             = "none"
  reset_password_allowed   = true
  login_with_email_allowed = true
  registration_allowed     = false
  login_theme              = var.login_theme
  password_policy          = "length(6)"
}

resource "keycloak_default_roles" "default_roles" {
  realm_id      = keycloak_realm.realm.id
  default_roles = ["offline_access", "uma_authorization"]
}

resource "keycloak_openid_client" "client" {
  realm_id                     = keycloak_realm.realm.id
  client_id                    = var.app_name
  name                         = "${var.app_name} Client"
  enabled                      = true
  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true
  valid_redirect_uris = [
    "http://localhost:${var.frontend_port}/*",
    "http://localhost:${var.frontend_port}",
    "*"
  ]
  web_origins = ["*"]
}

resource "keycloak_openid_user_realm_role_protocol_mapper" "realm_roles_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.client.id
  name      = "realm-roles-mapper"

  claim_name          = "roles"
  multivalued         = true
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "email_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.client.id
  name      = "email"

  user_attribute   = "email"
  claim_name       = "email"
  claim_value_type = "String"

  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "preferred_username_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.client.id
  name      = "preferred_username"

  user_attribute   = "username"
  claim_name       = "preferred_username"
  claim_value_type = "String"

  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_role" "ops_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "ops"
  description = "Operations role for managing bars and certifications"
}

resource "keycloak_role" "client_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "client"
  description = "Client role with read-only bar exploration access"
}

resource "keycloak_user" "ops_user" {
  realm_id   = keycloak_realm.realm.id
  username   = "ops@sampleapp.local"
  email      = "ops@sampleapp.local"
  first_name = "Ops"
  last_name  = "User"
  enabled    = true
  initial_password {
    value     = var.default_password
    temporary = false
  }
}

resource "keycloak_user" "client_user" {
  realm_id   = keycloak_realm.realm.id
  username   = "client@sampleapp.local"
  email      = "client@sampleapp.local"
  first_name = "Client"
  last_name  = "User"
  enabled    = true
  initial_password {
    value     = var.default_password
    temporary = false
  }
}

resource "keycloak_user_roles" "ops_user_roles" {
  realm_id = keycloak_realm.realm.id
  user_id  = keycloak_user.ops_user.id
  role_ids = [keycloak_role.ops_role.id]
}

resource "keycloak_user_roles" "client_user_roles" {
  realm_id = keycloak_realm.realm.id
  user_id  = keycloak_user.client_user.id
  role_ids = [keycloak_role.client_role.id]
}
