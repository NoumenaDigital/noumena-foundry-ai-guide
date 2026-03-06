# 15 - Seed Scripts Generation

## ⚠️ CRITICAL: Client Request Only

**Seed scripts should ONLY be generated when explicitly requested by the client.** This is an optional feature that should not be included in the standard application build process unless the client specifically asks for it.

**When to generate seed scripts:**
- ✅ Client explicitly requests seed data or sample data
- ✅ Client asks for "test data" or "demo data"
- ✅ Client wants to populate the database with initial data

**When NOT to generate seed scripts:**
- ❌ Standard application builds
- ❌ Client hasn't mentioned seed data
- ❌ Automatic generation without request

---

## Overview

Seed scripts populate the Noumena Engine with realistic protocol instances via its REST API. They must:
- Authenticate against Keycloak as the correct user for each protocol creation
- Use the actual generated OpenAPI endpoints (no invented API calls)
- Respect NPL `require()` constraints and party automation rules
- Seed protocols in dependency order

**Every seed script is unique to its application.** You must discover the actual protocols, API endpoints, party rules, and Keycloak users from the workspace — never copy examples from this guide verbatim.

## Prerequisites

Before generating seed scripts, the following must already exist in the workspace:
- ✅ NPL protocols compiled (`npl/src/main/`)
- ✅ Party automation rules (`npl/src/main/rules.yml`)
- ✅ OpenAPI specification generated (`npl/output/`)
- ✅ Generated TypeScript API client (`frontend/src/generated/`)
- ✅ Keycloak provisioning (`keycloak-provisioning/*.tf`)

---

## Step 1: Discover the Application Domain

**You MUST read the actual workspace files before writing any code.** Do not rely on examples in this guide.

### 1.1 Read the Business Specification

Read `spec/business-spec.json` to understand:
- Application name and description
- Roles and their permissions
- Entities and their relationships
- State machines and transitions

### 1.2 Read All NPL Protocol Files

List and read all `.npl` files under `npl/src/main/` to discover:
- Protocol names and their package
- Protocol parameters (constructor arguments with types)
- Party declarations (e.g., `protocol[owner, manager] ...`)
- `require()` constraints that seed data must satisfy
- State declarations and transitions
- Permissions and their state constraints (which actions are available in which states)

**Classify each protocol:**

| Category | Seed? | Examples |
|----------|-------|---------|
| Master/reference data | ✅ Yes — seed first | Product catalogs, configuration, categories |
| Operational entities | ✅ Yes — seed second | Accounts, orders, inventories |
| Transaction/event protocols | ⚠️ Maybe — only if needed to reach desired states | Payments, transfers, consumption events |
| Audit/log protocols | ❌ No — created as side effects | Audit entries, change logs |

### 1.3 Read the Party Automation Rules

Read `npl/src/main/rules.yml` to understand for each protocol:
- Which party uses `extract` (the logged-in user — determines who must authenticate)
- Which parties use `set` (fixed/role-based — assigned automatically)
- Which parties use `require` (validation constraints on the authenticated user)
- Which parties are NOT in rules.yml (must be passed via `@parties` in the request body)

**This is critical.** The `extract` rule tells you which Keycloak user must be authenticated when creating each protocol via the API. If a protocol extracts `email` and requires `roles: [owner]`, then you must authenticate as a user who has the `owner` role.

### 1.4 Read the Keycloak Provisioning

Read `keycloak-provisioning/terraform.tf` to discover:
- All provisioned test users (usernames, emails)
- Their assigned roles
- The realm name (from `keycloak_realm` resource)
- The client ID (from `keycloak_openid_client` resource)
- The default password variable name

This tells you exactly which users are available and what roles they have, so you can match them to the `extract`/`require` rules.

### 1.5 Read the Generated API Client

Read `frontend/src/generated/apis/DefaultApi.ts` (or list the `frontend/src/generated/` directory) to discover:
- The actual API method names for creating each protocol (e.g., `createWineUsingPost`)
- The request body structure expected by each endpoint
- Available action endpoints (for triggering state transitions after creation)

**Only use API methods that actually exist in the generated client.** Do not invent endpoint names.

---

## Step 2: Design the Seed Plan

Before writing code, plan the seeding order and data:

### 2.1 Determine Seeding Order

Based on protocol dependencies (one protocol's creation may require another to exist first):

```
1. Independent protocols (no dependencies on other protocols)
2. Protocols that reference protocols from step 1
3. State transitions / actions on created protocols
4. Protocols that depend on protocols being in specific states
```

### 2.2 Map Users to Protocol Creations

For each protocol to seed, determine which Keycloak user must authenticate:

```
Protocol X (extract: owner requires role "owner")
  → Authenticate as: owner@test.com (has "owner" role)

Protocol Y (extract: client requires role "client")  
  → Authenticate as: client1@test.com, client2@test.com (have "client" role)
```

### 2.3 Plan Realistic Seed Data

For each protocol, plan 2-5 instances with:
- Varied but realistic field values
- Values that satisfy all `require()` constraints
- Different states if applicable (create some, then transition them)
- Relationships to other seeded protocols where needed

---

## Step 3: Create the Seed Script

### 3.1 Technology Choice: Python

Use Python with the `requests` library for seed scripts. Python is preferred because:
- Simple HTTP calls without build tooling
- Easy Keycloak token acquisition
- Readable sequential flow
- No dependency on the frontend build

### 3.2 Directory Structure

```
seed/
├── seed_all.py              # Main orchestrator — runs all scripts in order
├── requirements.txt         # Python dependencies (requests, python-dotenv)
├── README.md                # Usage instructions
├── create_<entity1>.py      # Creates instances of first protocol
├── create_<entity2>.py      # Creates instances of second protocol
└── <action>_<entities>.py   # Performs state transitions if needed
```

### 3.3 Authentication Helper

Every seed script needs to acquire a Keycloak access token. Create a shared helper:

```python
import requests
import os

def get_access_token(keycloak_url: str, realm: str, client_id: str,
                     username: str, password: str) -> str:
    """Acquire an access token from Keycloak using password grant."""
    token_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"
    response = requests.post(token_url, data={
        "grant_type": "password",
        "client_id": client_id,
        "username": username,
        "password": password,
    })
    response.raise_for_status()
    return response.json()["access_token"]

def get_auth_header(token: str) -> dict:
    """Build Authorization header from token."""
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
```

### 3.4 Main Orchestrator Pattern

The `seed_all.py` script should:
1. Load configuration from environment variables (or `.env` file)
2. Run each sub-script in dependency order
3. Report results

```python
#!/usr/bin/env python3
"""
Seed script for [APP_NAME].
Populates the Noumena Engine with test data via API calls.

Usage:
    cd seed && pip install -r requirements.txt
    python seed_all.py
"""
import os
import sys
from dotenv import load_dotenv

# Load .env from project root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_dir, ".env"))

def get_config():
    """Load configuration from environment variables."""
    return {
        "api_url": os.getenv("VITE_LOCAL_API_URL", "http://localhost:12001"),
        "keycloak_url": os.getenv("VITE_LOCAL_KC_URL", "http://localhost:11000"),
        "realm": os.getenv("KC_REALM", "your-app"),          # From terraform.tf
        "client_id": os.getenv("KC_CLIENT_ID", "your-app"),  # From terraform.tf
        "password": os.getenv("KC_INITIAL_USER_PASSWORD", "welcome"),
    }

def main():
    config = get_config()
    print(f"API URL: {config['api_url']}")
    print(f"Keycloak URL: {config['keycloak_url']}")
    print(f"Realm: {config['realm']}")
    print()

    # Import and run each seed step in order
    # Replace with actual sub-scripts based on discovered protocols
    from create_entity1 import seed_entity1
    from create_entity2 import seed_entity2

    seed_entity1(config)
    seed_entity2(config)

    print("\n✅ Seeding complete!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
```

### 3.5 Protocol Creation Pattern

Each sub-script creates instances of one protocol type:

```python
"""Seed [ProtocolName] instances."""
import requests

# Import the shared auth helper
from seed_all import get_config, get_access_token, get_auth_header

def seed_protocol_name(config: dict):
    """Create [ProtocolName] instances via the API."""
    
    # Authenticate as the correct user based on rules.yml extract rule
    # e.g., if extract requires role "owner", use the owner user
    token = get_access_token(
        config["keycloak_url"],
        config["realm"],
        config["client_id"],
        "owner@test.com",          # User with the required role
        config["password"],
    )
    headers = get_auth_header(token)
    
    # API endpoint — must match the generated OpenAPI client
    # Read frontend/src/generated/apis/DefaultApi.ts to find the exact URL
    url = f"{config['api_url']}/npl/objects/packagename/ProtocolName"
    
    # Seed data — must satisfy all require() constraints from the NPL protocol
    instances = [
        {
            "field1": "realistic value 1",
            "field2": 42,
            # '@parties' — only include parties NOT defined in rules.yml
            # If all parties are automated, use empty dict:
            "@parties": {},
        },
        {
            "field1": "realistic value 2",
            "field2": 99,
            "@parties": {},
        },
    ]
    
    print(f"  Seeding ProtocolName...")
    for i, data in enumerate(instances):
        try:
            resp = requests.post(url, json=data, headers=headers)
            resp.raise_for_status()
            protocol_id = resp.json().get("id", "unknown")
            print(f"    ✓ Created ProtocolName #{i+1} (id: {protocol_id})")
        except requests.exceptions.HTTPError as e:
            print(f"    ✗ Failed ProtocolName #{i+1}: {e.response.status_code} {e.response.text}")
```

### 3.6 State Transition Pattern

If you need to advance protocols to specific states after creation:

```python
def transition_protocol(config: dict, protocol_id: str, action: str,
                        username: str, payload: dict = None):
    """Invoke a permission/action on an existing protocol instance."""
    token = get_access_token(
        config["keycloak_url"], config["realm"],
        config["client_id"], username, config["password"],
    )
    headers = get_auth_header(token)
    
    # Action URL pattern for Noumena Engine
    url = f"{config['api_url']}/npl/objects/{protocol_id}/actions/{action}"
    
    resp = requests.post(url, json=payload or {}, headers=headers)
    resp.raise_for_status()
    return resp.json()
```

### 3.7 Party Handling in Requests

**When all parties are automated (all defined in rules.yml):**

```python
data = {
    "field1": "value",
    "@parties": {},  # Empty — all parties assigned by rules.yml
}
```

**When some parties are NOT in rules.yml:**

```python
data = {
    "field1": "value",
    "@parties": {
        # Only pass parties NOT defined in rules.yml
        "recipient": {
            "claims": {
                "email": ["recipient@test.com"]
            }
        }
    },
}
```

**Never pass parties that ARE defined in rules.yml** — this causes duplicate party errors.

---

## Step 4: Configuration and Dependencies

### 4.1 Requirements File

**File:** `seed/requirements.txt`

```
requests>=2.28.0
python-dotenv>=1.0.0
```

### 4.2 README

**File:** `seed/README.md`

```markdown
# Seed Scripts

Populates the application with test data for development and demonstration.

## Prerequisites

- Application is running (`make up` or `docker compose up`)
- Keycloak is provisioned with test users
- NPL protocols are deployed

## Usage

```bash
cd seed
pip install -r requirements.txt
python seed_all.py
```

## Configuration

The script reads configuration from environment variables or the project root `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_LOCAL_API_URL` | `http://localhost:12001` | Noumena Engine API URL |
| `VITE_LOCAL_KC_URL` | `http://localhost:11000` | Keycloak URL |
| `KC_REALM` | (from terraform) | Keycloak realm name |
| `KC_CLIENT_ID` | (from terraform) | OIDC client ID |
| `KC_INITIAL_USER_PASSWORD` | `welcome` | Default password for test users |
```

---

## Step 5: Validate Seed Data Against NPL Constraints

Before finalizing seed data, verify it satisfies all NPL constraints:

### 5.1 Check `require()` Statements

For each protocol, read its NPL source and ensure every `require()` is satisfied:

```
require(name.length() > 0, "Name must not be empty")
→ Every seed instance must have a non-empty name

require(amount > 0, "Amount must be positive")
→ Every seed instance must have amount > 0

require(vintage >= 1900 && vintage <= now().year(), "...")
→ Use realistic years within the valid range
```

### 5.2 Check Type Constraints

- `Number` fields: Use realistic numeric values
- `Text` fields: Use non-empty, meaningful strings
- `DateTime` fields: Use ISO 8601 format (e.g., `"2025-01-15T10:00:00Z"`)
- `LocalDate` fields: Use ISO date format (e.g., `"2025-01-15"`)
- `Boolean` fields: Use `true` / `false`
- `List<T>` fields: Use JSON arrays
- `Optional<T>` fields: Can be omitted or set to `null`
- Enum fields: Must use valid enum values from the NPL source

### 5.3 Check State Constraints

- Permissions with state constraints (e.g., `| created`) can only be invoked when the protocol is in that state
- Plan state transitions to reach the desired state before invoking constrained actions

---

## Step 6: Idempotency

Seed scripts should be safe to run multiple times. Strategies:

### 6.1 Check Before Creating

Query existing instances before creating new ones:

```python
def protocol_exists(config, headers, url, field_name, field_value):
    """Check if a protocol instance with a specific field value already exists."""
    list_url = url  # GET on the collection URL lists instances
    resp = requests.get(list_url, headers=headers)
    if resp.ok:
        for item in resp.json().get("items", []):
            if item.get(field_name) == field_value:
                return True
    return False
```

### 6.2 Use Try/Catch with Logging

If idempotent checking is complex, use a simpler approach:

```python
try:
    resp = requests.post(url, json=data, headers=headers)
    resp.raise_for_status()
    print(f"  ✓ Created {name}")
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 409:
        print(f"  ⏭ {name} already exists, skipping")
    else:
        print(f"  ✗ Failed {name}: {e.response.text}")
```

---

## Best Practices

1. **Always discover from workspace files** — never hardcode protocol names, fields, or API paths from memory or examples
2. **Keep data realistic** — use domain-appropriate values, not "Test 1", "Test 2"
3. **Match users to party rules** — the authenticated user must match the `extract`/`require` rules in `rules.yml`
4. **Seed in dependency order** — independent protocols first, dependent protocols second
5. **Handle errors gracefully** — log failures but continue seeding other entities
6. **Make scripts idempotent** — safe to run multiple times
7. **Use environment variables** — never hardcode URLs or credentials
8. **Document the seed plan** — add comments explaining which user seeds which protocol and why

---

## Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Authenticating as wrong user | 403 Forbidden or wrong party assigned | Check `rules.yml` extract rule for each protocol |
| Passing automated parties in `@parties` | "Received N parties instead of expected M" | Only pass parties NOT in `rules.yml` |
| Inventing API endpoints | 404 Not Found | Read `frontend/src/generated/apis/DefaultApi.ts` |
| Violating `require()` constraints | 400 Bad Request | Read `.npl` files for all `require()` statements |
| Wrong seeding order | 404 or missing references | Map dependencies before coding |
| Hardcoding URLs | Script breaks in different environments | Use environment variables |
| Not handling auth token expiry | 401 after long-running seed | Re-acquire token before each batch |

---

## Troubleshooting

### 403 Forbidden on Protocol Creation

**Cause:** The authenticated user doesn't have the required role/claims for the protocol's `extract`/`require` rule.

**Fix:** Check `rules.yml` for the protocol's extract rule, find which role is required, then authenticate as a user with that role (from `terraform.tf`).

### "Received N parties instead of expected M"

**Cause:** Passing parties in `@parties` that are already defined in `rules.yml`.

**Fix:** Only pass parties that are NOT in `rules.yml`. If all parties are automated, use `"@parties": {}`.

### 400 Bad Request with Validation Error

**Cause:** Seed data violates a `require()` constraint in the NPL protocol.

**Fix:** Read the protocol's `.npl` file, find all `require()` statements, and ensure seed data satisfies every one.

### 404 Not Found on API Endpoint

**Cause:** Using an incorrect API endpoint path.

**Fix:** Read `frontend/src/generated/apis/DefaultApi.ts` to find the exact endpoint URL for each protocol.

### Token Acquisition Fails

**Cause:** Keycloak not running, wrong realm/client, or user doesn't exist.

**Fix:** 
- Verify Keycloak is running (`http://localhost:11000`)
- Check realm name in `terraform.tf` (`keycloak_realm` resource)
- Check client ID in `terraform.tf` (`keycloak_openid_client` resource)
- Verify user exists in `terraform.tf` (`keycloak_user` resources)

---

## Summary

Seed script generation requires careful workspace discovery:

1. ✅ **Read `spec/business-spec.json`** — understand the domain
2. ✅ **Read all `.npl` files** — discover protocols, fields, constraints, states
3. ✅ **Read `rules.yml`** — understand party automation (who authenticates for what)
4. ✅ **Read `terraform.tf`** — discover available test users and their roles
5. ✅ **Read generated API client** — discover actual API endpoints
6. ✅ **Plan seeding order** — respect protocol dependencies
7. ✅ **Write Python seed scripts** — with proper auth, realistic data, idempotency
8. ✅ **Validate against NPL constraints** — ensure all `require()` statements are satisfied

**Remember: Every application is different. Always discover the domain from the workspace files.**
