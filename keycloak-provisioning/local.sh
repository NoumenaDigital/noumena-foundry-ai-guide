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

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -n "$ACCESS_TOKEN" ]; then
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

cd /terraform
terraform init -upgrade
terraform apply -auto-approve -state=/state/state.tfstate

echo "Keycloak Provisioning Complete!"
