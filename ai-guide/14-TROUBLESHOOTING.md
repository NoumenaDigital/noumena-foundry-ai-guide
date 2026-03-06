# 14 - Troubleshooting Guide

This guide documents common issues encountered during NPL application development and their solutions.

## Table of Contents

1. [NPL Compilation Issues](#1-npl-compilation-issues)
2. [Docker and Database Issues](#2-docker-and-database-issues)
3. [API Path Configuration](#3-api-path-configuration)
4. [Keycloak Issues](#4-keycloak-issues)
5. [Frontend Integration Issues](#5-frontend-integration-issues)

---

## 1. NPL Compilation Issues

### 1.1 Reserved Keywords as Variable or Field Names

**Error patterns:**
```
E0001: Syntax error: mismatched input 'resume' expecting IDENTIFIER
E0001: Syntax error: missing '}' at 'protocol'
E0001: Syntax error: mismatched input ':' expecting '['
```

**Cause:** NPL has reserved keywords that cannot be used as variable names, parameter names, struct field names, or any other identifier position. The parser interprets the reserved word as a language construct, producing confusing cascading errors.

**Most commonly hit reserved keywords (words AI tends to use as names):**

| Reserved word | Context where it gets misused | Safe alternative |
|---|---|---|
| `protocol` | Audit trails, metadata | `protocolName`, `sourceProtocol` |
| `state` | Status tracking | `protocolState`, `statusText` |
| `resume` | Medical/scheduling | `resumeDate`, `medicationResumeDate` |
| `symbol` | Currency/unit fields | `symbolValue`, `currencySymbol` |
| `return` | Return/refund flows | `returnRequest`, `returnDate` |
| `match` | Sports/matching | `matchResult`, `pairing` |
| `permission` | Access control | `permissionLevel`, `accessPermission` |
| `package` | Shipping/logistics | `packageInfo`, `shipmentPackage` |
| `notification` | Alert systems | `notificationMessage`, `alertNotification` |
| `guard` | Security contexts | `guardName`, `securityGuard` |
| `init` | Initialization tracking | `initDate`, `initialized` |
| `copy` | Document/versioning | `copyCount`, `documentCopy` |

**Solution:** Rename the field/variable to avoid the reserved keyword:
```npl
// ❌ WRONG - 'protocol' is a reserved keyword
struct AuditEntry {
    protocol: Text,
    protocolId: Optional<Text>
};

// ✅ CORRECT - Use a different name
struct AuditEntry {
    protocolName: Text,
    protocolId: Optional<Text>
};
```

```npl
// ❌ WRONG - 'resume' is a reserved keyword
private var resumeDate: Optional<DateTime> = optionalOf<DateTime>();

// ✅ CORRECT - Use a different name
private var medicationResumeDate: Optional<DateTime> = optionalOf<DateTime>();
```

**Full List of Reserved Keywords:**
`after`, `and`, `become`, `before`, `between`, `const`, `copy`, `else`, `enum`, `false`, `final`, `for`, `function`, `guard`, `identifier`, `if`, `in`, `init`, `initial`, `is`, `match`, `native`, `not`, `notification`, `notify`, `obligation`, `optional`, `or`, `otherwise`, `package`, `permission`, `private`, `protocol`, `require`, `resume`, `return`, `returns`, `state`, `struct`, `symbol`, `this`, `true`, `union`, `use`, `var`, `vararg`, `with`

---

## 2. Docker and Database Issues

### 2.1 NPL Type Redefinition Errors

**Error:**
```
Caused by: com.noumenadigital.npl.lang.RedefinitionErrorException: 
E0020: Attempt to redefine 'TypeName', already defined at 'file:/migrations/npl-1.0/package/File.npl:3'
```

**Cause:** The database contains migration state from a previous application run with different NPL packages or type definitions. This commonly happens when:
- You rename NPL packages (e.g., `cooperlife` → `cooper`)
- You rename or reorganize NPL type definitions
- You change the structure of existing protocols

**Solution:** Remove Docker volumes to clear the database state:

```bash
# Stop all containers and remove volumes
docker compose down -v

# Start fresh
docker compose up --build -d
```

**Prevention:** When making significant changes to NPL package structure:
1. Always stop containers first: `docker compose down`
2. Remove volumes: `docker compose down -v`
3. Rebuild and start: `docker compose up --build -d`

### 2.2 Engine Container Keeps Restarting

**Symptoms:** The engine container shows status "Restarting" repeatedly.

**Diagnosis:** Check engine logs:
```bash
docker compose logs engine 2>&1 | tail -100
```

**Common Causes:**
1. **NPL compilation errors** - Check for syntax errors in NPL files
2. **Database connection issues** - Ensure engine-db is healthy first
3. **Migration conflicts** - See section 2.1 above

---

## 3. API Path Configuration

### 3.1 Incorrect API Endpoint Paths

**Error:** API calls return 404 Not Found

**Cause:** The NPL Engine uses a specific path format that differs from what you might expect:

```
WRONG:  /protocol/package.ProtocolName
WRONG:  /api/v1/package/ProtocolName
CORRECT: /npl/package/ProtocolName/
```

**Key Points:**
- Path prefix is `/npl/` not `/protocol/` or `/api/`
- Package and protocol are separated by `/` not `.`
- Trailing slash `/` is often required
- Case-sensitive: use exact protocol names

**Example Mappings:**

| NPL Protocol | Correct API Path |
|-------------|------------------|
| `package cooper; protocol DogProfile` | `/npl/cooper/DogProfile/` |
| `package cooper; protocol Command` | `/npl/cooper/Command/` |
| `package myapp.users; protocol User` | `/npl/myapp.users/User/` |

### 3.2 Finding the Correct API Paths

The OpenAPI specification is the source of truth for API paths:

```bash
# Find where OpenAPI spec is generated
find npl/target -name "*openapi*.yml" 2>/dev/null

# View the paths section
grep "^  /npl" npl/target/generated-sources/openapi/*-openapi.yml | head -30
```

### 3.3 Frontend API Client Configuration

When writing the frontend API client, ensure paths match exactly:

```typescript
// ❌ WRONG
const response = await axios.get('/protocol/cooper.DogProfile');

// ✅ CORRECT  
const response = await axios.get('/npl/cooper/DogProfile/');
```

---

## 4. Keycloak Issues

### 4.0 Canonical Local Auth Profile

Use this profile consistently across `.env`, frontend, and docker-compose:

- `VITE_KEYCLOAK_URL=http://host.docker.internal:11000`
- `ENGINE_ALLOWED_ISSUERS` includes:
  - `http://keycloak:11000/realms/${VITE_NC_KC_REALM}`
  - `http://localhost:11000/realms/${VITE_NC_KC_REALM}`
  - `http://host.docker.internal:11000/realms/${VITE_NC_KC_REALM}`
- `READ_MODEL_ALLOWED_ISSUERS` includes the same set
- Keycloak has no explicit `KC_HOSTNAME`/`KC_HOSTNAME_PORT` and uses `--hostname-strict=false`

### 4.1 Terraform Provisioning Fails with 409 Conflict

**Error:** `Error: error sending POST request to /admin/realms: 409 Conflict` or `User exists with same email`

**Cause:** Resources (realm, users, roles) already exist in Keycloak's database (persistent `keycloak-db` volume), but Terraform state is lost between container restarts because the `/state` directory inside the container is not backed by a named volume.

**Prevention:** Ensure `docker-compose.yml` mounts a named volume for Terraform state persistence:
```yaml
volumes:
  kc-provision-state: { }

services:
  keycloak-provisioning:
    # ...
    volumes:
      - kc-provision-state:/state  # Persists Terraform state between restarts
```

**If the error already occurred:**

1. **Option 1: Delete the realm manually** (for development only):
   ```bash
   # Get admin token
   TOKEN=$(curl -s -X POST "http://localhost:11000/realms/master/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin" \
     -d "password=admin" \
     -d "grant_type=password" \
     -d "client_id=admin-cli" | jq -r '.access_token')
   
   # Delete realm
   curl -X DELETE "http://localhost:11000/admin/realms/issuetracker" \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Option 2: Import into Terraform state manually**:
   ```bash
   cd keycloak-provisioning
   # Import realm
   terraform import keycloak_realm.realm issuetracker
   
   # Import users (get user IDs from Keycloak admin console first)
   terraform import keycloak_user.customer issuetracker/<user-id>
   terraform import keycloak_user.employee issuetracker/<user-id>
   terraform import keycloak_user.manager issuetracker/<user-id>
   
   # Import roles
   terraform import keycloak_role.customer_role issuetracker/customer
   terraform import keycloak_role.internal_employee_role issuetracker/internal-employee
   
   terraform apply
   ```

3. **Option 3: Reset Keycloak completely** (removes all data):
   ```bash
   docker compose down -v keycloak keycloak-db
   docker compose up -d keycloak keycloak-db
   # Wait for Keycloak to be ready, then run provisioning again
   ```

### 4.2 Terraform Provisioning Fails with Connection Errors

**Error:** Keycloak Terraform provisioning fails with connection errors

**Cause:** SSL is enabled by default on the master realm, which blocks Terraform.

**Solution:** The `local.sh` script must disable SSL before running Terraform:

```bash
# Wait for Keycloak to be ready
until curl -s http://keycloak:8080/health/ready 2>/dev/null | grep -q "UP"; do
  sleep 5
done

# CRITICAL: Disable SSL for master realm
curl -s -X PUT "http://keycloak:8080/admin/realms/master" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sslRequired": "none"}'

# Now Terraform can run
terraform apply -auto-approve
```

### 4.2 Authentication Redirect Issues

**Symptoms:** Login works but redirect back to app fails

**Checklist:**
1. Verify `VITE_KEYCLOAK_URL` points to correct Keycloak host
2. Check realm name matches in Keycloak config
3. Verify client ID matches between frontend and Keycloak
4. Check redirect URIs are configured in Keycloak client settings

### 4.2.1 Redirect URL Contains `.../undefined/protocol/openid-connect/...`

**Signature:**
```
http://localhost:5173/undefined/protocol/openid-connect/auth?...
```

**Cause:** Frontend auth env values are missing at build/runtime (`VITE_KEYCLOAK_URL`, `VITE_NC_KC_REALM`, `VITE_NC_KC_CLIENT_ID`).

**Fix:**
1. Set all three vars in root `.env` (and `frontend/.env` if running Vite locally).
2. Rebuild/restart frontend.
3. Implement AuthProvider fail-fast guard: if config missing, show `configError` and do not call `login()`.

### 4.3 Engine Rejects JWT Tokens (401 Unauthorized)

**Error:** API calls return 401 Unauthorized even with valid tokens

**Cause:** The NPL Engine's `ENGINE_ALLOWED_ISSUERS` only includes the internal Docker network URL (`http://keycloak:11000/realms/...`), but the frontend (running in browser) uses `localhost` to access Keycloak, so tokens are issued with `http://localhost:11000/realms/...` as the issuer.

**Solution:** Include **both** URLs in `ENGINE_ALLOWED_ISSUERS`:

```yaml
# docker-compose.yml
engine:
  environment:
    ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM}
```

**Why Both URLs Are Needed:**
- `http://keycloak:11000/...` - Internal Docker network (for service-to-service communication)
- `http://localhost:11000/...` - Browser access (for frontend authentication)

**Verification:**
```bash
# Check engine logs for issuer validation errors
docker compose logs engine | grep -i issuer

# Test API call with token
TOKEN=$(curl -s -X POST "http://localhost:11000/realms/cooper/protocol/openid-connect/token" \
  -d "client_id=cooper-app" \
  -d "username=owner@cooper.app" \
  -d "password=welcome" \
  -d "grant_type=password" | jq -r '.access_token')

curl -s http://localhost:12000/npl/cooper/DogProfile/ \
  -H "Authorization: Bearer $TOKEN"
```

### 4.4 Engine Cannot Fetch JWKS (Failed to retrieve JWKS)

**Error:**
```
Failed to retrieve JWKS for http://localhost:11000/realms/cooper-life-manager
java.io.FileNotFoundException: http://localhost:11000/realms/cooper-life-manager/.well-known/openid-configuration
```

**Cause:** The engine container is trying to fetch JWKS from `localhost:11000`, but from inside the Docker container, `localhost` refers to the container itself, not the host machine. The engine cannot reach Keycloak using `localhost`.

**Solution:** Align issuer URL and allowed issuer lists instead of introducing separate Keycloak URL knobs:

```yaml
# .env
VITE_KEYCLOAK_URL=http://host.docker.internal:11000

# docker-compose.yml
engine:
  environment:
    ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM},http://host.docker.internal:11000/realms/${VITE_NC_KC_REALM}
```

**Why This Works:**
- Browser gets tokens from one canonical issuer URL
- Engine/read-model explicitly trust that issuer plus internal/local aliases
- JWKS lookup no longer depends on unresolved `localhost` inside containers

**Important:** Do NOT add `--hostname`, `--hostname-admin`, or `KC_HOSTNAME` settings to Keycloak - these are not needed for local development and can cause redirect issues.

### 4.4.1 Login Ends with `Cookie not found`

**Signature:**
```
POST .../login-actions/authenticate?... 400 (Bad Request)
We are sorry... Cookie not found. Please make sure cookies are enabled in your browser.
```

**Cause:** Keycloak URL host mismatch between issued login flow and browser host, often caused by explicit `KC_HOSTNAME`/`KC_HOSTNAME_PORT` forcing a different hostname.

**Fix:**
1. Remove explicit hostname settings (`KC_HOSTNAME`, `KC_HOSTNAME_PORT`, `--hostname`, `--hostname-admin`).
2. Keep `--hostname-strict=false` and restart Keycloak.
3. Keep frontend Keycloak URL and issuer policy aligned (section 4.0).

### 4.4.2 `503` on `/npl/...` After Login + `Failed to retrieve JWKS for http://localhost:11000/...`

**Signature:**
```
GET http://localhost:12001/npl/<package>/<Protocol>/?... 503 (Service Unavailable)
Failed to retrieve JWKS for http://localhost:11000/realms/<realm>
```

**Cause:** Token issuer is `localhost`, but engine/read-model inside Docker cannot reach host `localhost` as Keycloak.

**Fix (deterministic):**
1. Set `VITE_KEYCLOAK_URL=http://host.docker.internal:11000`.
2. Keep issuer allow-lists in engine/read-model including `host.docker.internal`, `localhost`, and `keycloak`.
3. Recreate `keycloak`, `engine`, `read-model`, and `frontend`.

### 4.4.3 Issuer/Hostname Decision Tree

1. **See `undefined/protocol`?**  
   -> Frontend env missing -> fix env + fail-fast AuthProvider guard.
2. **See `Cookie not found` after login submit?**  
   -> Host mismatch in Keycloak login flow -> remove explicit Keycloak hostname config.
3. **See `503` on `/npl/...` + JWKS localhost in engine logs?**  
   -> Issuer unreachable from container -> switch frontend issuer URL to `host.docker.internal` and align allowed issuers.
4. **Still failing?**  
   -> Verify token issuer claim (`iss`) matches one of allowed issuers and rerun token + protected endpoint checks.

### 4.4.1 Keycloak Container Unhealthy (Healthcheck Fails)

**Error:** `container coppersappnd-keycloak-1 is unhealthy`

**Common Causes:**

1. **Curl not installed:** The Keycloak container doesn't have `curl` installed, which is required for the healthcheck. The Keycloak base image is minimal/distroless and doesn't include package managers.

2. **Missing library dependencies:** Curl is installed but missing required shared libraries (SSL, Kerberos, etc.)

3. **Incorrect health check configuration:** Wrong port, hostname, or endpoint

**Solution:** Use a multi-stage build to install curl with ALL dependencies in `keycloak/Dockerfile`:

```dockerfile
# Multi-stage build to install curl
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest AS curl-builder
RUN microdnf install -y curl-minimal && microdnf clean all
# Copy curl and all its library dependencies
# All curl libraries are in /lib64/ in UBI9
RUN mkdir -p /output/usr/bin /output/lib64 && \
    cp /usr/bin/curl /output/usr/bin/ && \
    # Copy all curl dependencies from /lib64/
    # Use -L to follow symlinks and copy the actual files
    cp -L /lib64/libcurl.so.4* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libssl.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libcrypto.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libnghttp2.so.14* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libgssapi_krb5.so.2* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkrb5.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libk5crypto.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libcom_err.so.2* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkrb5support.so.0* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkeyutils.so.1* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libpcre2-8.so.0* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libselinux.so.1* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libz.so.1* /output/lib64/ 2>/dev/null || true

FROM quay.io/keycloak/keycloak:24.0

# Copy curl and its dependencies from builder
USER root
COPY --from=curl-builder /output/usr/bin/curl /usr/bin/curl
COPY --from=curl-builder /output/lib64/ /lib64/
USER 1000

# Copy custom theme
COPY theme/winecellar /opt/keycloak/themes/winecellar
```

**CRITICAL Health Check Configuration:**

The health check in `docker-compose.yml` must use the correct configuration:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:11000/health/ready"]
  interval: 10s
  timeout: 5s
  retries: 30
  start_period: 60s
```

**Important Notes:**
- **Port:** Health endpoint is on port **11000** (HTTP port), NOT port 9000
- **Hostname:** Use `localhost` (not `keycloak` service name) since health check runs inside the container
- **Endpoint:** Use `/health/ready` for readiness check (Keycloak 24.0+ standard)
- **Format:** Use array format `["CMD", "curl", "-f", "..."]` for better Docker compatibility
- **Flags:** `-f` flag makes curl fail on HTTP errors (returns non-zero exit code)
- **Timing:** `start_period: 60s` gives Keycloak time to start (database migrations, realm init)
- **Libraries:** Must copy ALL curl dependencies explicitly. In UBI9, all libraries are in `/lib64/` (not `/usr/lib64/`)
- **Library list:** The following 13 libraries must be copied: `libcurl.so.4`, `libssl.so.3`, `libcrypto.so.3`, `libnghttp2.so.14`, `libgssapi_krb5.so.2`, `libkrb5.so.3`, `libk5crypto.so.3`, `libcom_err.so.2`, `libkrb5support.so.0`, `libkeyutils.so.1`, `libpcre2-8.so.0`, `libselinux.so.1`, `libz.so.1`
- **Copy flag:** Use `-L` flag with `cp` to follow symlinks and copy the actual library files

**Troubleshooting Missing Libraries:**

If you see errors like:
```
curl: error while loading shared libraries: libcurl.so.4: cannot open shared object file
```

1. **Verify library location in builder:** Check where libraries are located in the UBI9 image:
```bash
docker run --rm registry.access.redhat.com/ubi9/ubi-minimal:latest sh -c "microdnf install -y curl-minimal > /dev/null 2>&1 && ldd /usr/bin/curl | awk '/=>/ {print \$3}'"
```

2. **Check which libraries are missing in Keycloak container:**
```bash
docker exec coppersappnd-keycloak-1 ldd /usr/bin/curl 2>&1 | grep "not found"
```

3. **Add missing libraries to Dockerfile:** All curl libraries in UBI9 are in `/lib64/`, so copy them explicitly:
```dockerfile
cp -L /lib64/libcurl.so.4* /output/lib64/ 2>/dev/null || true;
# ... add other missing libraries
```

4. **Rebuild the image:**
```bash
docker compose build keycloak
docker compose up -d keycloak
```

**Note:** The working solution explicitly copies all 13 required libraries from `/lib64/` rather than trying to use `ldd` with complex shell commands, which is more reliable in Docker build contexts.

**Verification:**
```bash
# Rebuild Keycloak image
docker compose build keycloak

# Restart Keycloak
docker compose restart keycloak

# Check health status
docker compose ps keycloak

# Test curl manually (from inside container)
docker compose exec keycloak curl -f http://localhost:11000/health/ready

# Check for missing libraries
docker compose exec keycloak ldd /usr/bin/curl | grep "not found"
```

### 4.4.2 Double-Protocol URL Error (http://http//keycloak)

**Error:** After login, Keycloak redirects to malformed URL: `http://http//keycloak:11000/...`

**Cause:** This error occurs when `--hostname` or `KC_HOSTNAME` settings are incorrectly configured in Keycloak. These settings are NOT needed for local development.

**Solution:** Remove any `--hostname`, `--hostname-admin`, or `KC_HOSTNAME` settings from your Keycloak configuration. For local development with `start-dev`, Keycloak handles hostnames automatically.

Correct minimal Keycloak command:
```yaml
keycloak:
  command: |
    start-dev
    --spi-events-listener-jboss-logging-success-level=info
    --spi-events-listener-jboss-logging-error-level=error
    --hostname-strict=false
    --health-enabled=true
    --http-enabled=true
    --metrics-enabled=true
    --db=postgres
```

**Note:** Do NOT add `--hostname`, `--hostname-admin`, or `KC_HOSTNAME` - these cause redirect issues in local development.

### 4.5 Invalid Redirect URI Error

**Error:** Keycloak shows "Invalid parameter: redirect_uri" error page

**Cause:** The frontend redirect URI is not configured in the Keycloak client settings.

**Solution: Update Terraform to Include Frontend Redirect URIs**

Update `keycloak-provisioning/terraform.tf` to include specific redirect URIs:

```hcl
resource "keycloak_openid_client" "client" {
  # ... other settings ...
  
  # Allow redirect URIs from localhost (for local development)
  valid_redirect_uris = [
    "http://localhost:${var.frontend_port}/*",
    "http://localhost:${var.frontend_port}",
    "*"  # Fallback for development - remove in production
  ]
  
  web_origins = [
    "http://localhost:${var.frontend_port}",
    "*"  # Fallback for development - remove in production
  ]
}
```

**Why Both Solutions Are Needed:**
- `--hostname-strict=false` flag allows Keycloak to accept redirect URIs from different hosts
- Terraform configuration explicitly lists allowed redirect URI patterns
- Together, they ensure the frontend can authenticate successfully

**Verification:**
1. Restart Keycloak: `docker compose restart keycloak`
2. Re-run provisioning: `docker compose up -d keycloak-provisioning`
3. Try logging in from the frontend
4. Check Keycloak logs: `docker compose logs keycloak | grep -i redirect`

---

### 4.6 Failed to Retrieve JWKS Error

**Error:** 
```
Failed to retrieve JWKS for http://localhost:11000/realms/winecellar
java.io.FileNotFoundException: http://localhost:11000/realms/winecellar/.well-known/openid-configuration
```

**Cause:** This is a Docker networking issue. The backend engine receives tokens with issuer `http://localhost:11000/realms/winecellar` (because the browser accessed Keycloak at localhost). When the engine tries to verify the token by fetching JWKS from the issuer URL, it fails because `localhost` inside the Docker container refers to the container itself, not the host machine.

**Solution: Keep Engine Dev Mode Off and Use Canonical Issuer**

The Noumena engine has an embedded OIDC server that runs in dev mode on port 11000, which can conflict with Keycloak. Ensure dev mode is disabled:

```yaml
# docker-compose.yml
services:
  engine:
    environment:
      ENGINE_DEV_MODE: false  # IMPORTANT: Disable to avoid port conflicts
      # ...
```

**Why Dev Mode Causes Issues:**
- When `ENGINE_DEV_MODE=true`, the engine runs an embedded OIDC server on port 11000
- This conflicts with external Keycloak which also uses port 11000
- The engine may try to verify tokens against the wrong OIDC server

**After applying issuer + dev-mode config:**
```bash
docker compose restart engine
```

**Note:** The `extra_hosts: ["localhost:host-gateway"]` approach may not work reliably on Docker Desktop for Mac. If you still have issues after disabling dev mode, see section 5.2 for the nginx proxy solution which handles both JWKS and CORS issues.

---

## 5. Frontend Integration Issues

### 5.1 API Calls Return 401 Unauthorized or 503 Service Unavailable

**🚨 THIS IS A CORNER PRINCIPLE - JWT TOKEN MUST BE PASSED WITH ALL REQUESTS**

**Symptoms:**
- API calls return `401 Unauthorized`
- API calls return `503 Service Unavailable`
- No `Authorization` header visible in browser Network tab
- Backend logs show: `"No Authorization header found on request"`

**Root Cause:** The JWT bearer token is not being included in API request headers.

**CRITICAL CHECKLIST:**
1. ✅ Verify Keycloak is returning a valid token after login (check browser console for token)
2. ✅ Check that the token is stored correctly (Keycloak stores it in memory)
3. ✅ **MUST:** Ensure axios interceptor adds Authorization header to GLOBAL axios instance
4. ✅ **MUST:** Verify interceptor uses `keycloakRef.current` (not direct prop)
5. ✅ **MUST:** Check browser Network tab - every request should have `Authorization: Bearer <token>` header
6. ✅ Verify token refresh is working (`updateToken(70)` called before requests)

**Solution: Use GLOBAL Axios Interceptor in ServiceProvider**

**The ServiceProvider MUST use a GLOBAL axios request interceptor** (not just a local instance interceptor) to automatically add the Authorization header to ALL API requests:

```typescript
// In ServiceProvider.tsx
import axios from 'axios';

// CRITICAL: Add to GLOBAL axios instance (not just local api instance)
axios.interceptors.request.use(
  async (config) => {
    const kc = keycloakRef.current; // Use ref to get latest instance
    
    if (!kc || !kc.authenticated) {
      console.warn('[ServiceProvider] Keycloak not authenticated');
      return config;
    }
    
    try {
      // Refresh token if needed (within 70 seconds of expiry)
      await kc.updateToken(70);
      
      const token = kc.token;
      if (token) {
        // CRITICAL: Add Authorization header
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[ServiceProvider] Authorization header added to:', config.url);
      } else {
        console.error('[ServiceProvider] No token available');
      }
    } catch (error) {
      // Even if refresh fails, try to use existing token
      const token = kc.token;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  }
);
```

**Debugging Steps:**

1. **Check browser console** - Look for `[ServiceProvider] Authorization header added` logs
2. **Check Network tab** - Open DevTools → Network → Select a request → Headers → Look for `Authorization: Bearer ...`
3. **Check Keycloak token** - In browser console: `keycloak.token` should return a JWT string
4. **Check authentication state** - In browser console: `keycloak.authenticated` should be `true`

**Common Mistakes:**

❌ **Wrong:** Only adding interceptor to local axios instance
```typescript
api.interceptors.request.use(...); // Only catches this instance
```

✅ **Correct:** Adding interceptor to global axios
```typescript
axios.interceptors.request.use(...); // Catches ALL axios requests
```

❌ **Wrong:** Using `keycloak` prop directly (stale closure)
```typescript
const { keycloak } = useAuth();
// Later in interceptor:
if (keycloak?.authenticated) { ... } // May be stale!
```

✅ **Correct:** Using `keycloakRef.current`
```typescript
const keycloakRef = useRef(keycloak);
useEffect(() => { keycloakRef.current = keycloak; }, [keycloak]);
// In interceptor:
const kc = keycloakRef.current; // Always current
```

See [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md) for the complete ServiceProvider implementation.

## Acceptance Gates Before "Done"

Do not mark setup complete until all checks pass:

1. `docker compose ps` shows `engine`, `keycloak`, `rabbitmq` healthy and `nginx-proxy` running.
2. `keycloak-provisioning` completed as one-shot (`Exited (0)`).
3. Password grant returns non-empty `access_token`.
4. Protected call to `/npl/<package>/<Protocol>/` with bearer token succeeds.
5. Frontend login reaches protected route without 503, while public explorer remains public.

### 5.2 CORS Errors

**Symptoms:** Browser console shows "CORS error" or "Invalid CORS request" when frontend calls the engine API.

**Cause:** The Noumena engine has strict CORS filtering. Even with `FRONTEND_URL` configured, it may reject cross-origin requests.

**Solution: Use Nginx Proxy with CORS Headers**

Instead of calling the engine directly (port 12000), route all API calls through the nginx proxy (port 12001) which adds proper CORS headers.

**Step 1: Update nginx configuration (`nginx/nginx.conf`):**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream engine {
        server engine:12000;
    }

    upstream read-model {
        server read-model:15000;
    }

    # Gateway: Engine + GraphQL with SSE support and CORS
    server {
        listen 12001;
        
        location / {
            # Handle CORS preflight requests
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
                add_header 'Access-Control-Max-Age' 86400;
                add_header 'Content-Length' 0;
                return 204;
            }
            
            proxy_pass http://engine;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers for all responses
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
            
            # SSE support
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
        }
        
        location /graphql {
            # Same CORS handling for GraphQL
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
                add_header 'Access-Control-Max-Age' 86400;
                return 204;
            }
            
            proxy_pass http://read-model/graphql;
            proxy_set_header Host $host;
            
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
        }
    }
}
```

**Step 2: Configure frontend to use nginx proxy (docker-compose.yml):**

```yaml
# docker-compose.yml
services:
  frontend:
    build:
      context: frontend
      dockerfile: Dockerfile.dev
    ports:
      - "${FRONTEND_PORT:-5173}:5173"
    volumes:
      - ./frontend:/app:delegated
      - /app/node_modules
    environment:
      # CRITICAL: Use nginx proxy (12001) instead of direct engine (12000)
      VITE_ENGINE_URL: http://localhost:12001
      VITE_KEYCLOAK_URL: ${VITE_KEYCLOAK_URL:-http://keycloak:11000}
      # These are hardcoded to the app slug during project setup
      VITE_NC_KC_REALM: winecellar
      VITE_NC_KC_CLIENT_ID: winecellar
```

**Step 3: Restart services:**

```bash
docker compose restart nginx-proxy frontend
```

**Verification:**

Test CORS preflight:
```bash
curl -v -X OPTIONS http://localhost:12001/api/npl/winecellar/Wine \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"
```

Should return `204 No Content` with CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With
```

**Why This Solution Works:**
1. Nginx handles CORS preflight (OPTIONS) requests with proper headers
2. Nginx adds CORS headers to all responses from the engine
3. Frontend calls nginx (12001) which proxies to engine (12000)
4. Engine never sees direct cross-origin requests

### 5.3 React Hook Form Not Updating State

**Symptoms:** Form fields appear filled but validation errors persist

**Cause:** Browser automation or programmatic value setting bypasses React's event handlers.

**Solution for manual testing:** Use the actual browser UI, not automation.

**Solution for programmatic forms:** Use React Hook Form's `setValue` method:

```typescript
const { setValue, handleSubmit } = useForm();

// ✅ CORRECT - Use setValue
setValue('fieldName', 'value', { shouldValidate: true });

// ❌ WRONG - Direct DOM manipulation
document.getElementById('fieldName').value = 'value';
```

---

## Quick Reference: Common Commands

### Reset Everything
```bash
# Full reset - removes all data
docker compose down -v
docker compose up --build -d
```

### Check Service Health
```bash
# View all container status
docker compose ps

# Check specific service logs
docker compose logs engine 2>&1 | tail -50
docker compose logs keycloak 2>&1 | tail -50
docker compose logs keycloak-provisioning 2>&1 | tail -30
```

### Rebuild Specific Service
```bash
# Rebuild and restart frontend only
docker compose up -d --build frontend

# Rebuild and restart engine only  
docker compose up -d --build engine
```

### Verify API Endpoints
```bash
# Test API endpoint (without auth - should return 401)
curl -s http://localhost:12000/npl/cooper/DogProfile/

# Test with auth token
TOKEN=$(curl -s -X POST "http://localhost:11000/realms/cooper/protocol/openid-connect/token" \
  -d "client_id=cooper-app" \
  -d "username=owner@cooper.app" \
  -d "password=welcome" \
  -d "grant_type=password" | jq -r '.access_token')

curl -s http://localhost:12000/npl/cooper/DogProfile/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## Debugging Workflow

When something goes wrong, follow this order:

1. **Check Docker container status**
   ```bash
   docker compose ps
   ```

2. **Check logs of failing service**
   ```bash
   docker compose logs <service-name> 2>&1 | tail -100
   ```

3. **For NPL/Engine issues:**
   - Check NPL compilation: `cd npl && mvn package`
   - Look for reserved keyword errors
   - Look for type redefinition errors

4. **For Database issues:**
   - Reset with `docker compose down -v`

5. **For Frontend issues:**
   - Check browser console for errors
   - Check network tab for failed requests
   - Verify API paths match OpenAPI spec

6. **For Auth issues:**
   - Check Keycloak provisioning logs
   - Verify realm and client configuration
   - Test token retrieval manually

