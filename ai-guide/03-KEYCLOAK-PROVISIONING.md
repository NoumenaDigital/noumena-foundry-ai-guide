# 03 - Keycloak Provisioning from NPL Protocols

## Overview

This guide explains how to **automatically generate Keycloak roles and users** based on the parties defined in your NPL protocols. The system analyzes all `@api` protocols to extract party names (like `bank`, `client`, `relationshipManager`) and creates corresponding roles in Keycloak.

> ⚠️ **MANDATORY: Keycloak Theme Customization**
> 
> **You MUST create and configure a custom Keycloak login theme before completing Keycloak provisioning.** The default Keycloak theme is not acceptable for production applications. See [03a-KEYCLOAK-THEMING.md](./03a-KEYCLOAK-THEMING.md) for complete instructions.
> 
> **Why mandatory:**
> - The login page is the first impression users have of your application
> - A branded login experience is essential for professional applications
> - This is a required feature that must be completed (see [00-STEP-BY-STEP.md](./00-STEP-BY-STEP.md#phase-4-required-features-must-implement))
> 
> **Before proceeding:** Ensure you have created your custom theme in `keycloak/theme/APPNAME/` and updated the `login_theme` variable in `terraform.tf`.

> ⚠️ **CRITICAL: Provision `paas` client for NPL CLI deploy**
>
> `npl deploy` uses password-grant auth and implicitly expects a Keycloak client with `client_id=paas`.
> If this client is missing, deploy commonly fails with:
> - `Invalid client`
> - `Invalid client credentials`
>
> This is **required for local deploy workflows** and must be present in `keycloak-provisioning/terraform.tf`.

## Concept

### NPL Protocol Parties

In NPL, protocols declare parties in their signature:

```npl
protocol[bank, client, relationshipManager] DogTraining(...) {
    // Protocol body
}
```

These parties (`bank`, `client`, `relationshipManager`) represent **roles** in the system.

### Role Generation Strategy

1. **Extract all unique parties** from all `@api` protocols
2. **Create Keycloak roles** for each party (party names map to role names)
3. **Create demo users** for each role
4. **Assign roles** to users

## Step 1: Analyze NPL Protocols

### Extract Parties

Scan all NPL files for protocol declarations:

```bash
# Find all protocol declarations
grep -r "protocol\[" npl/src/main/npl-1.0/

# Example output:
# protocol[bank, client] DogTraining(...)
# protocol[bank, relationshipManager] Trainer(...)
# protocol[client] TrainingSession(...)
```

**Parties found:**
- `bank`
- `client`
- `relationshipManager`

**Roles to create:**
- `bank` (from `bank`)
- `client` (from `client`)
- `relationshipManager` (from `relationshipManager`)

### Party Naming Convention

- Party identifiers use camelCase (e.g., `bank`, `relationshipManager`)
- These map directly to Keycloak role names
- **Service parties** (like `fmp`, `exConvert`) can be treated as service accounts

## Step 2: Generate Terraform Configuration

**File:** `keycloak-provisioning/terraform.tf`

### Base Configuration

```hcl
# Variables
variable "default_password" {
  type = string
}

variable "app_name" {
  type    = string
  default = "myapp"  # Replace with your app name - used for realm and client ID
}

variable "login_theme" {
  type    = string
  default = "APPNAME"  # ⚠️ MANDATORY: Must match theme folder name in keycloak/theme/APPNAME/
  # DO NOT use "keycloak" (default theme) - you MUST create a custom theme
  # See 03a-KEYCLOAK-THEMING.md for complete theming guide
}

# Provider
terraform {
  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = "~> 5.5.0"
    }
  }
}

provider "keycloak" {
  client_id     = "admin-cli"
  username  = var.keycloak_admin_username
  password  = var.keycloak_admin_password
  url       = var.keycloak_url
  # Note: tls_insecure is not supported by the provider - use HTTP for local dev
}

# Master Realm — allow iframe embedding (required for Foundry preview)
data "keycloak_realm" "master" {
  realm = "master"
}

import {
  id = "master"
  to = keycloak_realm.master
}

resource "keycloak_realm" "master" {
  realm        = data.keycloak_realm.master.id
  ssl_required = "none"

  security_defenses {
    headers {
      x_frame_options                    = "ALLOWALL"
      content_security_policy            = "frame-src 'self'; frame-ancestors http://localhost:* https://localhost:*; object-src 'none';"
      content_security_policy_report_only = ""
      x_content_type_options             = "nosniff"
      x_robots_tag                       = "none"
      x_xss_protection                   = "1; mode=block"
      strict_transport_security          = "max-age=31536000; includeSubDomains"
    }
  }
}

# App Realm
resource "keycloak_realm" "realm" {
  realm                    = var.app_name
  ssl_required             = "none"
  reset_password_allowed   = true
  login_with_email_allowed = true
  registration_allowed     = false
  login_theme              = var.login_theme

  # Allow Keycloak to be embedded in iframes (required for Foundry preview)
  # frame-ancestors allows any localhost port to embed Keycloak pages
  security_defenses {
    headers {
      x_frame_options                    = "ALLOWALL"
      content_security_policy            = "frame-src 'self'; frame-ancestors http://localhost:* https://localhost:*; object-src 'none';"
      content_security_policy_report_only = ""
      x_content_type_options             = "nosniff"
      x_robots_tag                       = "none"
      x_xss_protection                   = "1; mode=block"
      strict_transport_security          = "max-age=31536000; includeSubDomains"
    }
  }
}

# Default roles
resource "keycloak_default_roles" "default_roles" {
  realm_id      = keycloak_realm.realm.id
  default_roles = ["offline_access", "uma_authorization"]
}

# OpenID Client
resource "keycloak_openid_client" "client" {
  realm_id                     = keycloak_realm.realm.id
  client_id                    = var.app_name  # Use app_name for consistency with realm
  name                         = "${var.app_name} Client"
  enabled                      = true
  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true
  # Allow redirect URIs from localhost (for local development)
  # In production, replace with specific frontend URLs
  valid_redirect_uris          = [
    "http://localhost:${var.frontend_port}/*",
    "http://localhost:${var.frontend_port}",
    "*"  # Fallback for development - remove in production
  ]
  web_origins                  = [
    "http://localhost:${var.frontend_port}",
    "*"  # Fallback for development - remove in production
  ]
  web_origins                  = ["*"]
}

# CRITICAL: NPL CLI deploy client (required by npl deploy password-grant flow)
resource "keycloak_openid_client" "paas_client" {
  realm_id                     = keycloak_realm.realm.id
  client_id                    = "paas"
  name                         = "NPL CLI Client"
  enabled                      = true
  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true
  valid_redirect_uris          = [
    "http://localhost:${var.frontend_port}/*",
    "http://localhost:${var.frontend_port}",
    "*"
  ]
  web_origins                  = ["*"]
}
```

### Protocol Mappers (CRITICAL for rules.yml)

**IMPORTANT:** Protocol mappers expose claims in the JWT token that can be used in `rules.yml`. Without these mappers, claims like `roles` won't be available as flat claims in the token.

> ⚠️ **Protocol mappers are per-client.** Each Keycloak client has its own set of mappers. If you add
> a `roles` mapper to the app client but not to the `paas` client, tokens obtained via `paas`
> (e.g. from seed scripts or `npl deploy`) will NOT have the flat `roles` claim — causing
> `'REQUIRE' rule criteria not met` errors. **Add the same mappers to every client that needs
> party automation claims.**

```hcl
# ============================================================================
# Protocol Mappers - Expose claims in JWT token
# ============================================================================
# IMPORTANT: These mappers must be added to EVERY client that obtains tokens
# used for protocol creation (app client, paas client, any seed/test client).

# --- App client mappers ---

# Realm roles mapper - exposes realm_access.roles as flat "roles" claim
# CRITICAL: This is required for rules.yml to access roles via the "roles" claim
resource "keycloak_openid_user_realm_role_protocol_mapper" "realm_roles" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.client.id
  name      = "realm-roles-mapper"

  claim_name          = "roles"           # This is the claim name used in rules.yml
  multivalued         = true
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# Email mapper - ensures email is in the token
resource "keycloak_openid_user_attribute_protocol_mapper" "email" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.client.id
  name      = "email-mapper"

  user_attribute      = "email"
  claim_name          = "email"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# --- paas client mappers (same claims, different client) ---

resource "keycloak_openid_user_realm_role_protocol_mapper" "paas_realm_roles" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.paas_client.id
  name      = "realm-roles-mapper"

  claim_name          = "roles"
  multivalued         = true
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "paas_email" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.paas_client.id
  name      = "email-mapper"

  user_attribute      = "email"
  claim_name          = "email"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}
```

**Why Protocol Mappers Matter:**

| Without Mapper | With Mapper |
|----------------|-------------|
| `realm_access.roles` (nested) | `roles` (flat array) |
| Can't use in `rules.yml` | Can use as `- roles` in extract, `roles:` in set/require |

**Common Mappers Needed:**

| Mapper Type | Purpose | Claim Name in rules.yml |
|-------------|---------|-------------------------|
| `keycloak_openid_user_realm_role_protocol_mapper` | Expose realm roles | `roles` |
| `keycloak_openid_user_attribute_protocol_mapper` | Expose user attributes | `email`, `organization`, etc. |
| `keycloak_openid_user_client_role_protocol_mapper` | Expose client-specific roles | `client_roles` |

### Generate Roles from NPL Parties

For each party found in NPL protocols, generate:

```hcl
# Role for 'bank' (from bank)
resource "keycloak_role" "bank_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "bank"
  description = "Bank role - can manage products and services"
}

# User for 'bank' role
resource "keycloak_user" "bank" {
  realm_id   = keycloak_realm.realm.id
  username   = "bank@noumena.cloud"
  email      = "bank@noumena.cloud"
  first_name = "Bank"
  last_name  = "User"

  attributes = {
    "role" = jsonencode(["bank"])
    "organization" = jsonencode(["Your Organization"])
    "department" = jsonencode(["Banking Operations"])
  }

  initial_password {
    value     = var.default_password
    temporary = false
  }
}

# Assign role to user
resource "keycloak_user_roles" "bank" {
  realm_id = keycloak_realm.realm.id
  user_id  = keycloak_user.bank.id
  role_ids = [
    keycloak_role.bank_role.id
  ]
}
```

## Step 3: Automated Role Generation Script

Create a script to generate Terraform configuration from NPL protocols:

**File:** `scripts/generate-keycloak-roles.js`

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Extract parties from NPL files
function extractParties(nplDir) {
  const parties = new Set();
  const files = execSync(`find ${nplDir} -name "*.npl"`, { encoding: 'utf-8' })
    .trim()
    .split('\n');

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const protocolMatches = content.matchAll(/protocol\[([^\]]+)\]/g);
    
    for (const match of protocolMatches) {
      const partyList = match[1];
      const partyNames = partyList.split(',').map(p => p.trim());
      partyNames.forEach(party => {
        parties.add(party);
      });
    }
  });

  return Array.from(parties);
}

// Generate Terraform role resources
function generateRoleTerraform(roleName) {
  const roleDisplayName = roleName.charAt(0).toUpperCase() + roleName.slice(1);
  const userName = roleName;
  const userEmail = `${roleName}@noumena.cloud`;
  
  return `
# --- ${roleDisplayName} role, user, and associations

resource "keycloak_role" "${roleName}_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "${roleName}"
  description = "${roleDisplayName} role - generated from NPL protocol parties"
}

resource "keycloak_user" "${roleName}" {
  realm_id   = keycloak_realm.realm.id
  depends_on = [keycloak_realm_user_profile.userprofile]
  username   = "${userEmail}"
  email      = "${userEmail}"
  first_name = "${roleDisplayName}"
  last_name  = "User"

  attributes = {
    "role" = jsonencode(["${roleName}"])
    "organization" = jsonencode(["Your Organization"])
    "department" = jsonencode(["${roleDisplayName} Operations"])
  }

  initial_password {
    value     = var.default_password
    temporary = false
  }
}

resource "keycloak_user_roles" "${roleName}" {
  realm_id = keycloak_realm.realm.id
  user_id  = keycloak_user.${roleName}.id
  role_ids = [
    keycloak_role.${roleName}_role.id
  ]
}
`;
}

// Main generation
function generateKeycloakProvisioning() {
  const nplDir = process.argv[2] || 'npl/src/main/npl-1.0';
  const outputFile = process.argv[3] || 'keycloak-provisioning/generated-roles.tf';
  
  console.log(`Scanning NPL files in: ${nplDir}`);
  const parties = extractParties(nplDir);
  
  console.log(`Found parties: ${parties.join(', ')}`);
  
  let terraformContent = `# Auto-generated Keycloak roles from NPL protocols
# Generated on: ${new Date().toISOString()}
# DO NOT EDIT MANUALLY - Regenerate using: node scripts/generate-keycloak-roles.js

`;

  parties.forEach(party => {
    terraformContent += generateRoleTerraform(party);
  });

  fs.writeFileSync(outputFile, terraformContent);
  console.log(`Generated Terraform configuration: ${outputFile}`);
}

generateKeycloakProvisioning();
```

## Step 4: Integration with Terraform

**File:** `keycloak-provisioning/terraform.tf`

Include the generated roles:

```hcl
# Base configuration (from Step 2)
# ...

# Include generated roles
# This file is auto-generated - do not edit manually
# Regenerate using: node scripts/generate-keycloak-roles.js
# source = "generated-roles.tf"
```

Or use Terraform modules:

```hcl
module "npl_roles" {
  source = "./modules/npl-roles"
  
  realm_id = keycloak_realm.realm.id
  default_password = var.default_password
  
  # Roles extracted from NPL
  roles = [
    "bank",
    "client",
    "relationshipManager"
  ]
}
```

## Step 5: Context-Based Role Descriptions

Use the original NPL generation context to create better role descriptions:

**Example Context:**
```
Create a dog training app with 3 roles (admin, trainer, guest) to manage, 
explain and track the progress of commands that a dog has learned.
```

**Generated Role Descriptions:**

```hcl
resource "keycloak_role" "admin_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "admin"
  description = "Administrator role - full access to manage dog training programs and system configuration"
}

resource "keycloak_role" "trainer_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "trainer"
  description = "Trainer role - can manage training sessions, track dog progress, and update command status"
}

resource "keycloak_role" "guest_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "guest"
  description = "Guest role - can view dog training information and progress reports"
}
```

## Step 6: Service Account Roles

For service parties (like `fmp`, `exConvert`), create service accounts:

```hcl
# Service role (from fmp)
resource "keycloak_role" "fmp_role" {
  realm_id    = keycloak_realm.realm.id
  name        = "fmp"
  description = "FMP service account - provides market data"
}

resource "keycloak_user" "fmp" {
  realm_id   = keycloak_realm.realm.id
  username   = "fmp@noumena.cloud"
  email      = "fmp@noumena.cloud"
  first_name = "FMP"
  last_name  = "Service"

  attributes = {
    "organization" = jsonencode(["FMP Service"])
  }

  initial_password {
    value     = var.default_password
    temporary = false
  }
}

resource "keycloak_user_roles" "fmp" {
  realm_id = keycloak_realm.realm.id
  user_id  = keycloak_user.fmp.id
  role_ids = [
    keycloak_role.fmp_role.id
  ]
}
```

## Step 7: Keycloak Provisioning Dockerfile

**File:** `keycloak-provisioning/Dockerfile`

```dockerfile
FROM hashicorp/terraform:latest

# Install curl for health checks (not included in base image)
RUN apk add --no-cache curl

WORKDIR /terraform
COPY providers.tf terraform.tf /terraform/
COPY *.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
VOLUME /state

RUN terraform init
ENTRYPOINT []
CMD ["/usr/local/bin/local.sh"]
```

> ⚠️ **Important:** The base Terraform image doesn't include `curl`, which is needed for health checks in `local.sh`.
>
> ⚠️ **Volume mount required:** The `VOLUME /state` in the Dockerfile defines where Terraform stores its state file. In `docker-compose.yml`, this **must** be backed by a named volume (`kc-provision-state:/state`). Without this, Terraform loses its state between container restarts and will attempt to re-create the realm, causing "duplicate key" errors because the realm already exists in the persistent `keycloak-db` volume.

**File:** `keycloak-provisioning/local.sh`

```bash
#!/bin/sh
set -e

echo "Waiting for Keycloak to be ready..."
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:11000}"
max_attempts=90
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -sf "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1; then
        echo "Keycloak is ready!"
        break
    fi
    # Fallback: try master realm endpoint
    if curl -sf "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; then
        echo "Keycloak is ready (master realm)!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts - Keycloak not ready yet..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Keycloak did not become ready in time"
    exit 1
fi

# CRITICAL: Disable SSL for master realm (required for admin console access in dev)
echo "Disabling SSL requirement for master realm..."
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_USER:-admin}" \
  -d "password=${KEYCLOAK_PASSWORD:-admin}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "$TOKEN_RESPONSE" ]; then
  curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/master" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"sslRequired": "none"}'
  echo "Master realm SSL requirement disabled."
else
  echo "Warning: Could not get admin token to disable SSL for master realm"
fi

# Set TF vars from environment
export TF_VAR_keycloak_admin_username="${KEYCLOAK_USER:-admin}"
export TF_VAR_keycloak_admin_password="${KEYCLOAK_PASSWORD:-admin}"
export TF_VAR_keycloak_url="${KEYCLOAK_URL}"

# ── Handle stale realm (Terraform state lost but realm persists in Keycloak DB) ──
# If the Terraform state file is missing/empty but the application realm already
# exists in Keycloak, Terraform will try to CREATE it and get a 409 Conflict.
# Fix: delete the stale realm so Terraform can recreate everything cleanly.
APP_REALM="${TF_VAR_app_name:-myapp}"
STATE_FILE="/state/state.tfstate"

if [ ! -s "$STATE_FILE" ]; then
  echo "No Terraform state found. Checking if realm '${APP_REALM}' already exists..."
  REALM_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${KEYCLOAK_URL}/admin/realms/${APP_REALM}")

  if [ "$REALM_CHECK" = "200" ]; then
    echo "WARNING: Realm '${APP_REALM}' exists but Terraform state is missing (stale realm)."
    echo "Deleting stale realm so Terraform can provision from scratch..."
    curl -s -X DELETE \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "${KEYCLOAK_URL}/admin/realms/${APP_REALM}"
    echo "Stale realm '${APP_REALM}' deleted."
  else
    echo "Realm '${APP_REALM}' does not exist yet. Terraform will create it."
  fi
else
  echo "Terraform state file found. Will run incremental apply."
fi

cd /terraform
terraform init -upgrade
terraform apply -auto-approve -state=/state/state.tfstate

echo "Keycloak Provisioning Complete!"
```

> ⚠️ **Password Policy:** The default password policy is `length(6)` for development. Change to `length(8)` or stronger for production.

## Step 8: Providers Configuration

**File:** `keycloak-provisioning/providers.tf`

```hcl
terraform {
  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = "~> 5.5.0"
    }
  }
}

provider "keycloak" {
  client_id     = "admin-cli"
  username  = var.keycloak_admin_username
  password  = var.keycloak_admin_password
  url       = var.keycloak_url
  # Note: tls_insecure is not supported by the provider - use HTTP for local dev
}
```

## Step 9: Generation Workflow

1. **Generate roles from NPL:**
   ```bash
   node scripts/generate-keycloak-roles.js npl/src/main/npl-1.0 keycloak-provisioning/generated-roles.tf
   ```

2. **Review generated roles:**
   - Check `keycloak-provisioning/generated-roles.tf`
   - Verify all parties are included
   - Adjust descriptions if needed

3. **Build provisioning image:**
   ```bash
   docker compose build keycloak-provisioning
   ```

4. **Run provisioning:**
   ```bash
   docker compose up keycloak-provisioning
   ```

## Step 10: Role Mapping Examples

### Example 1: Simple App

**NPL Protocols:**
```npl
protocol[admin, trainer, guest] DogTraining(...)
protocol[admin, trainer] TrainingSession(...)
```

**Generated Roles:**
- `admin` - Full access
- `trainer` - Can manage training
- `guest` - Read-only access

### Example 2: Financial App

**NPL Protocols:**
```npl
protocol[bank, client] Account(...)
protocol[bank, relationshipManager] Product(...)
protocol[bank, client, relationshipManager] Offer(...)
```

**Generated Roles:**
- `bank` - Bank operations
- `client` - Client access
- `relationshipManager` - Relationship management

## Best Practices

1. **Review generated roles** before provisioning
2. **Add role descriptions** based on context
3. **Create additional users** for testing
4. **Document role permissions** in README
5. **Regenerate** when NPL protocols change

## Troubleshooting

### "duplicate key value violates unique constraint" / 409 Conflict on restart

**Symptom:** Keycloak provisioning fails with `409 Conflict` or `ModelDuplicateException: Duplicate resource error`. Typically happens on the second `make up` or when restarting the preview.

**Cause:** Terraform state is lost between container restarts. The `keycloak-db` volume persists the realm, but Terraform thinks it needs to create everything from scratch because it has no state file.

**Fix (prevention):** Ensure the `keycloak-provisioning` service in `docker-compose.yml` mounts a named volume for Terraform state:

```yaml
volumes:
  kc-provision-state: { }

services:
  keycloak-provisioning:
    # ...
    volumes:
      - kc-provision-state:/state
```

**Fix (resilience in local.sh):** Even with the named volume, state can still be lost (e.g. `docker-compose down -v`). Add stale-realm detection to `local.sh` — insert this block **after** the `ACCESS_TOKEN` is obtained and **before** `terraform init`:

```bash
# ── Handle stale realm (Terraform state lost but realm persists in Keycloak DB) ──
APP_REALM="${TF_VAR_app_name:-myapp}"
STATE_FILE="/state/state.tfstate"

if [ ! -s "$STATE_FILE" ]; then
  echo "No Terraform state found. Checking if realm '${APP_REALM}' already exists..."
  REALM_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${KEYCLOAK_URL}/admin/realms/${APP_REALM}")

  if [ "$REALM_CHECK" = "200" ]; then
    echo "WARNING: Realm '${APP_REALM}' exists but Terraform state is missing."
    echo "Deleting stale realm so Terraform can provision from scratch..."
    curl -s -X DELETE \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "${KEYCLOAK_URL}/admin/realms/${APP_REALM}"
    echo "Stale realm deleted."
  else
    echo "Realm does not exist yet. Terraform will create it."
  fi
else
  echo "Terraform state file found. Will run incremental apply."
fi
```

> **Note:** The Foundry build system automatically patches `local.sh` with this block during post-phase infrastructure enforcement. If you see the error in a manually-created project, add the block above.

### `'REQUIRE' rule criteria not met` when creating protocols via seed script or CLI

**Symptom:** Seed scripts or API calls using the `paas` client fail with:
```
Failed to extract access claim: roles
```
or:
```
'REQUIRE' rule criteria not met for 'member'
```

**Cause:** The `paas` client is missing protocol mappers. Each Keycloak client has its **own** set of mappers — adding a `roles` mapper to the app client does NOT make it available on `paas`. Without the mapper, the JWT token has `realm_access.roles` (nested) instead of `roles` (flat), so `rules.yml` can't find the claim.

**Fix:** Add the same protocol mappers (realm roles, email) to both the app client and the `paas` client in `terraform.tf`. See the "Protocol Mappers" section above.

### Roles not appearing
- Check Terraform apply logs
- Verify Keycloak is healthy
- Check role names match frontend expectations

### Users can't login
- Verify default password is set
- Check user email format
- Verify realm name matches

### Missing roles
- Regenerate roles from NPL
- Check NPL protocol syntax
- Verify party extraction logic

## Next Steps

Once Keycloak provisioning is set up:
- Test login with generated users
- Verify roles in Keycloak admin console
- Update frontend role checks if needed
- Document role permissions

Then proceed to:
- [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md) - Set up frontend project

## Summary

This approach ensures:
- ✅ Roles automatically match NPL protocol parties
- ✅ Users are created for each role
- ✅ Consistent naming between NPL and Keycloak
- ✅ Easy regeneration when protocols change
- ✅ Context-aware role descriptions

