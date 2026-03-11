# 02a - Party Automation

## Overview

Party automation defines engine-level rules to automatically construct and assign parties when protocols are instantiated via the API. This removes the need to manually pass parties in every API request and ensures consistent party assignment based on authentication context.

**Reference:** [Noumena Documentation - Party Automation](https://documentation.noumenadigital.com/runtime/tools/party-automation/)

## When Party Automation Applies

Party automation rules are **only applied** when protocols are created via API endpoints:
- `POST /api/engine/protocols`
- `POST /npl/{package}/{protocol}`

Rules are **NOT** observed during:
- Native NPL execution (tests, internal protocol calls)
- Direct protocol instantiation in NPL code

## Rule Types

Party automation supports three rule types:

### 1. `extract` - Build Party from JWT Claims

Extracts party information from the authenticated user's JWT token.

```yaml
winecellar.Wine:
  owner:
    extract:
      claims:
        - preferred_username
```

**Use Case:** Assign the logged-in user to a party. The party is built from claims in the user's authentication token.

**Important:** Generally, you should only have **ONE `extract` rule per protocol** - the logged-in user should be assigned to only one party.

### 2. `set` - Assign Fixed Party

Assigns a specific party with predefined claims.

```yaml
winecellar.Wine:
  cellarManager:
    set:
      claims:
        email:
          - manager@example.com
        role:
          - cellarManager
```

**Use Cases:**
- **Specific known user:** Set exact claims (email, role, etc.) for a single known party
- **Generic access:** Set only role claim (no email) to allow any user with that role

**Example - Generic "All Users" Access:**
```yaml
winecellar.Bottle:
  user:
    set:
      claims:
        role:
          - user
        # No email claim = accessible to anyone with 'user' role
```

### 3. `require` - Validate Claims (No Assignment)

Validates that required claims are present in the JWT token, but does not assign the party.

```yaml
winecellar.Wine:
  owner:
    require:
      claims:
        role:
          - owner
```

**Use Cases:**
- **Standalone validation:** Ensure the user has required claims before allowing protocol creation
- **Combined with `extract`:** Validate that extracted claims have specific values (see "Combining extract and require" below)

**Important:** `require` can be combined with `extract` for the same party to add validation constraints.

## Rules File Structure

> **Note:** The `rules.yml` file is **optional but highly encouraged**. If your protocols use party automation (which most real-world apps do), you should create this file. However, the build will succeed without it — Phase 4 (API Client Generation) will detect a missing `rules.yml` and remove stale references from `npl.yml` and `migration.yml` automatically. If you're unsure about the correct rules, it's better to omit the file than to create an invalid one.

**File:** `npl/src/main/rules.yml`

```yaml
# Party automation rules
# Reference: https://documentation.noumenadigital.com/runtime/tools/party-automation/

package-name.ProtocolName:
  # For logged-in user party (extract uses LIST syntax)
  loggedInParty:
    extract:
      claims:
        - claim-name-to-extract    # List item with "-"
    require:                        # Optional: add validation
      claims:
        claim-name:                 # Key with colon
          - required-value          # Required value(s)

  # For other parties (set uses OBJECT syntax)
  otherParty:
    set:
      claims:
        claim-name:                 # Key with colon
          - claim-value             # Value(s)
```

### Schema Breakdown

- **`package-name.ProtocolName`** - Fully qualified protocol name (e.g., `winecellar.Wine`)
- **`party-name`** - Party name from protocol signature (e.g., `owner`, `cellarManager`)
- **`rule-type`** - One of `extract`, `set`, or `require`
- **`claims`** - Authorization claims structure

## Critical Syntax Differences

**IMPORTANT:** `extract` uses a **different syntax** than `set` and `require`. This is a common source of errors.

### `extract` - Uses LIST Syntax (claim names only)

`extract` specifies **WHICH claims to extract** from the token. It uses a **list of claim names**:

```yaml
customer:
  extract:
    claims:
      - roles                   # List item with "-" - just the claim NAME
      - email                   # Another claim to extract
```

### `set` and `require` - Use OBJECT Syntax (claim names with values)

`set` and `require` specify **WHAT VALUES** the claims should have. They use **key-value objects**:

```yaml
internalEmployee:
  set:
    claims:
      roles:                    # Claim name as KEY (with colon)
        - internal-employee     # Required VALUE(s)
```

```yaml
customer:
  require:
    claims:
      roles:                    # Claim name as KEY (with colon)
        - customer              # Required VALUE(s)
```

### Side-by-Side Comparison

| Rule Type | Purpose | Syntax Style | Example |
|-----------|---------|--------------|---------|
| `extract` | Get claims FROM token | List of names | `claims:` then `- roles` |
| `require` | Validate claims HAVE values | Key-value object | `claims:` then `roles:` then `- customer` |
| `set` | Assign fixed claims WITH values | Key-value object | `claims:` then `roles:` then `- admin` |

### Complete Example: Two-Party Protocol

```yaml
issuetracker.Issue:
  # Logged-in user - EXTRACT their claims, REQUIRE specific role
  customer:
    extract:
      claims:
        - roles                   # LIST syntax - extract this claim
        - email
    require:
      claims:
        roles:                    # OBJECT syntax - validate value
          - customer

  # Other party - SET fixed claims for role-based access
  internalEmployee:
    set:
      claims:
        roles:                    # OBJECT syntax - set value
          - internal-employee
```

**Key Points:**
- `customer` uses `extract` + `require`: "Get this user's claims, but only if they have the 'customer' role"
- `internalEmployee` uses `set`: "Allow anyone with 'internal-employee' role to act as this party"
- Only ONE `extract` per protocol - the logged-in user can only be assigned to one party

## Claims Must Match JWT Token Structure

**CRITICAL:** The claim names in `rules.yml` must match exactly what appears in the JWT token.

### Keycloak Roles Example

Keycloak stores realm roles in a **nested** structure:
```json
{
  "realm_access": {
    "roles": ["customer", "user"]
  }
}
```

To use these roles in `rules.yml`, you need a **protocol mapper** in Keycloak to expose them as a flat `roles` claim:
```json
{
  "roles": ["customer", "user"]
}
```

See [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md) for how to configure the protocol mapper.

### Common Claim Names

| Claim | Description | Requires Mapper? |
|-------|-------------|------------------|
| `email` | User's email address | No (standard) |
| `preferred_username` | Username | No (standard) |
| `roles` | Realm roles as flat array | **Yes** - needs `keycloak_openid_user_realm_role_protocol_mapper` |
| `organization` | Custom user attribute | Yes - needs attribute mapper |
| `department` | Custom user attribute | Yes - needs attribute mapper |

## Important Restrictions

1. **`set` and `extract` are mutually exclusive** - Cannot use both `set` and `extract` for the same party
2. **`extract` and `require` can be combined** - You can use both `extract` and `require` for the same party to add validation constraints (see Pattern 5 below)
3. **Rules are validated during migration** - Invalid rules cause migration to fail
4. **Only ONE `extract` per protocol** - Generally, the logged-in user should be assigned to only one party

## Common Patterns

### Pattern 1: Logged-in User as Owner + Fixed Manager

```yaml
winecellar.Wine:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # Single known cellar manager - set with specific claims
  cellarManager:
    set:
      claims:
        email:
          - manager@example.com
        role:
          - cellarManager
```

**Frontend:** Pass empty `@parties: {}` - all parties handled by automation.

### Pattern 2: Logged-in User + Generic Role Access

```yaml
winecellar.Bottle:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # Generic "all users" access - set with role only
  user:
    set:
      claims:
        role:
          - user
```

**Frontend:** Pass empty `@parties: {}` - all parties handled by automation.

### Pattern 3: Logged-in User + Variable Parties

```yaml
winecellar.Wine:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # cellarManager NOT in rules.yml - must be passed via @parties in frontend
```

**Frontend:** Pass only parties NOT in rules.yml:
```typescript
'@parties': {
  cellarManager: { claims: { email: [selectedManagerEmail] } }
}
```

### Pattern 4: Mixed Approach (Most Common)

```yaml
winecellar.Bottle:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # Fixed cellar manager
  cellarManager:
    set:
      claims:
        email:
          - manager@example.com
        role:
          - cellarManager
  # user NOT in rules.yml - passed via frontend
```

**Frontend:** Pass only parties NOT in rules.yml:
```typescript
'@parties': {
  user: { claims: { email: [selectedUserEmail] } }
}
```

### Pattern 5: Combining extract and require (Role-Based Validation)

Extract claims from the logged-in user, but require that certain claims have specific values. This ensures only users with the required role can create the protocol.

```yaml
winecellar.Wine:
  # Extract email and role from logged-in user, but require role is "owner"
  # Only owners can create wines
  owner:
    extract:
      claims:
        - email
        - role
    require:
      claims:
        role:
          - owner
```

**How it works:**
1. `extract` takes the `email` and `role` claims from the logged-in user's JWT token
2. `require` validates that the `role` claim must be `"owner"`
3. If the user doesn't have `role: owner`, protocol creation fails
4. The `require` doesn't need to cover all extracted claims - it only validates the ones you specify

**Use Case:** Restrict protocol creation to users with specific roles, while still extracting their identity from the token.

**Example - Multiple Role Options:**
```yaml
winecellar.PremiumWine:
  owner:
    extract:
      claims:
        - email
        - role
        - organization
    require:
      claims:
        role:
          - owner
          - premiumMember
        # User must have either "owner" OR "premiumMember" role
```

**Frontend:** Pass empty `@parties: {}` - party is extracted and validated automatically.

### Pattern 6: Require-Only Parties (Caller Must Pass via `@parties`)

A party with only `require` (no `extract`, no `set`) is **not auto-assigned** by the engine. The caller must pass the party explicitly via `@parties`. The engine only validates that the passed claims satisfy the `require` constraints.

**Use case:** A protocol party that isn't the logged-in user and isn't a fixed role — it's chosen dynamically by the caller (e.g. from a dropdown in the UI) but must meet certain constraints.

```yaml
structuredproducts.BRCProduct:
  # Logged-in user (the structurer) — extract + require
  ProductStructurer:
    extract:
      claims:
        - role
        - organization
        - email
    require:
      claims:
        role:
          - structurer

  # Compliance officer — require only, passed by caller
  ComplianceOfficer:
    require:
      claims:
        role:
          - compliance

  # Operations manager — require only, passed by caller
  OperationsManager:
    require:
      claims:
        role:
          - operations

  # System agent — set (hardcoded)
  CalculationAgent:
    set:
      claims:
        organization:
          - BRC_BANK
        systemRole:
          - calculation-agent
```

**Frontend:** Pass require-only parties in `@parties` with claims that satisfy the constraints:
```typescript
await api.createBrcProduct({
  requestBody: {
    ...data,
    '@parties': {
      // require-only parties must be passed by the caller
      ComplianceOfficer: { claims: { role: ['compliance'], organization: ['BRC_BANK'] } },
      OperationsManager: { claims: { role: ['operations'], organization: ['BRC_BANK'] } },
      // Do NOT pass ProductStructurer (extract) or CalculationAgent (set)
    },
  },
});
```

**Seed scripts:** The Foundry build system automatically resolves require-only parties by finding a user from `users.json` whose claims satisfy the `require` constraints and embeds the `@parties` dict into the generated seed script.

**Important:**
- Require-only parties are **not** the same as parties omitted from `rules.yml`. Require-only validates claims; omitted parties accept anything.
- Require-only makes sense for parties that are **not the creator** — the creating user typically uses `extract` (with or without `require`).
- The engine will reject the request if the passed claims don't satisfy the `require` rules.

### Pattern 7: Two-Party Protocol with Role-Based Access (Most Common for Business Apps)

This is the most common pattern for business applications with two distinct user roles (e.g., customer vs employee, buyer vs seller).

```yaml
issuetracker.Issue:
  # Party 1: Logged-in user with role validation
  # Uses extract (LIST syntax) + require (OBJECT syntax)
  customer:
    extract:
      claims:
        - roles                   # Extract this claim from JWT
        - email
    require:
      claims:
        roles:                    # Require it contains...
          - customer              # ...this value

  # Party 2: Role-based access for other users
  # Uses set (OBJECT syntax) - anyone with this role can access
  internalEmployee:
    set:
      claims:
        roles:                    # Anyone with this claim...
          - internal-employee     # ...having this value can act as this party
```

**How it works:**
1. `customer`: The logged-in user's `roles` claim is extracted, and validated to contain `"customer"`
2. `internalEmployee`: Any user with `roles` containing `"internal-employee"` can act as this party

**Key Points:**
- Only ONE `extract` - the logged-in user is assigned to `customer`
- Use `set` for the other party - this grants access based on role, not identity
- `extract` uses LIST syntax (`- claim-name`)
- `require` and `set` use OBJECT syntax (`claim-name:` then `- value`)
- Claims must be flat in the JWT token - use Keycloak protocol mappers if needed

**Frontend:** Pass empty `@parties: {}` - all parties handled by automation.

## The `@parties` JSON Format

When passing parties via the API (for parties not auto-assigned by `extract` or `set`), you must use the correct JSON structure. The `_Party` type is:

```typescript
type _Party = {
    claims: Record<string, Array<string>>;
};
```

### Correct format

```json
{
  "@parties": {
    "member": {
      "claims": {
        "entity": ["Identifier:member1@example.com"],
        "roles": ["member"],
        "email": ["member1@example.com"]
      }
    }
  }
}
```

### Common mistakes

```json
// ❌ WRONG — missing "claims" wrapper
{ "member": { "entity": ["Identifier:user@example.com"] } }

// ❌ WRONG — "access" is not a standard claims key
{ "member": { "claims": { "entity": ["Identifier:user@example.com"], "access": [] } } }

// ❌ WRONG — values must be arrays of strings, not plain strings
{ "member": { "claims": { "entity": "Identifier:user@example.com" } } }
```

### `require` rules validate `@parties` claims

> ⚠️ **Critical:** When a party has a `require` rule, the claims you pass in `@parties` must satisfy that rule. The engine validates ALL parties — including those passed by the caller, not just those extracted from the JWT.

**Example:** Given this `rules.yml`:
```yaml
fitness.Subscription:
  admin:
    extract:
      claims:
        - roles
        - email
    require:
      claims:
        roles:
          - admin
  member:
    require:
      claims:
        roles:
          - member
```

The `member` party has a `require` rule checking for `roles: [member]`. When the admin creates a Subscription and passes the member via `@parties`, the payload **must include the `roles` claim**:

```json
{
  "memberEmail": "member1@example.com",
  "plan": "PREMIUM",
  "startDate": "2026-01-01",
  "endDate": "2027-01-01",
  "@parties": {
    "member": {
      "claims": {
        "entity": ["Identifier:member1@example.com"],
        "roles": ["member"]
      }
    }
  }
}
```

Without `"roles": ["member"]`, the engine returns:
```
'REQUIRE' rule criteria not met for 'member'.
```

**curl example:**
```bash
TOKEN=$(curl -s http://keycloak.localtest.me:11000/realms/myapp/protocol/openid-connect/token \
  -d "grant_type=password&client_id=myapp&username=admin@myapp.local&password=welcome" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:12001/npl/fitness/Subscription/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberEmail": "member1@myapp.local",
    "plan": "PREMIUM",
    "startDate": "2026-01-01",
    "endDate": "2027-01-01",
    "@parties": {
      "member": {
        "claims": {
          "entity": ["Identifier:member1@myapp.local"],
          "roles": ["member"]
        }
      }
    }
  }'
```

## Frontend Integration

### When All Parties Are Automated

If all parties are defined in `rules.yml`, pass an empty `@parties` object:

```typescript
await api.createWine({
  requestBody: {
    ...data,
    '@parties': {}, // Empty - all parties assigned via rule automation
  },
});
```

### When Some Parties Are Not Automated

If some parties are NOT in `rules.yml`, pass only those parties:

```typescript
await api.createBottle({
  requestBody: {
    ...data,
    '@parties': {
      // Only pass parties NOT defined in rules.yml
      user: { claims: { email: [selectedUserEmail] } }
    },
  },
});
```

### Critical Rule: Never Duplicate

**❌ WRONG:** Passing parties that are already in `rules.yml` causes duplicate party errors:

```typescript
// If rules.yml has extract for owner, this will cause errors:
'@parties': {
  owner: { claims: { email: [userEmail] } }, // ❌ Duplicate!
}
```

**✅ CORRECT:** Only pass parties NOT in `rules.yml`:

```typescript
// If rules.yml handles owner, don't pass it:
'@parties': {
  // Only parties NOT in rules.yml
}
```

## Decision Tree: When to Use Each Approach

```
Is the party the logged-in user?
├─ YES → Do you need to validate the user's role/claims?
│   ├─ YES → Use `extract` + `require` (extract claims, require specific values)
│   │       Example: extract email+role, require role=owner
│   │
│   └─ NO → Use `extract` with preferred_username (or other claims)
│
└─ NO → Is it a single known user or system agent?
    ├─ YES → Use `set` with full claims (email, role, etc.)
    │
    └─ NO → Is it a generic role (all users with that role can act as this party)?
        ├─ YES → Use `set` with role only (no email)
        │
        └─ NO → Must the party meet specific claim constraints?
            ├─ YES → Use `require` only — caller passes via @parties,
            │        engine validates claims satisfy the constraints
            │
            └─ NO → Omit from rules.yml, pass via @parties in frontend
```

## Example: Complete Configuration

**File:** `npl/src/main/rules.yml`

```yaml
# Party automation rules
# Reference: https://documentation.noumenadigital.com/runtime/tools/party-automation/

winecellar.Wine:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # Single known cellar manager - set with specific claims
  cellarManager:
    set:
      claims:
        email:
          - manager@example.com
        role:
          - cellarManager

winecellar.Bottle:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
  # Single known cellar manager - set with specific claims
  cellarManager:
    set:
      claims:
        email:
          - manager@example.com
        role:
          - cellarManager
  # Generic "all users" access - set with role only (no email = accessible to anyone with 'user' role)
  user:
    set:
      claims:
        role:
          - user

winecellar.ConsumptionPolicy:
  # Logged-in user becomes the owner
  owner:
    extract:
      claims:
        - preferred_username
```

**Frontend Forms:** All use empty `@parties: {}` since all parties are automated.

## Deployment

Party automation rules are deployed via the migration process:

1. Rules are validated during migration
2. Invalid rules cause migration to fail
3. If no rules file is provided, existing rules remain unchanged
4. To delete all existing rules, provide an empty rules descriptor file

## Troubleshooting

### Error: "array found, object expected" or "SchemaViolationException"

**Cause:** Using wrong YAML syntax structure in `rules.yml`.

**Common Mistakes:**

```yaml
# ❌ WRONG - Using object syntax with extract
customer:
  extract:
    claims:
      roles:                     # Wrong! extract uses list syntax
        - customer

# ✅ CORRECT - extract uses list syntax
customer:
  extract:
    claims:
      - roles                    # List item with "-"
```

```yaml
# ❌ WRONG - Using list syntax with set/require
employee:
  set:
    claims:
      - internal-employee        # Wrong! set uses object syntax

# ✅ CORRECT - set uses object syntax
employee:
  set:
    claims:
      roles:                     # Key with colon
        - internal-employee      # Value
```

### Error: Claims not found or party not assigned

**Cause:** Claim names in `rules.yml` don't match what's in the JWT token.

**Common Issue:** Using `realm_access.roles` when Keycloak stores roles as nested objects.

**Solution:** 
1. Add a protocol mapper in Keycloak to expose roles as flat `roles` claim
2. Use flat claim names in `rules.yml` (e.g., `roles`, `email`, not `realm_access.roles`)

### Error: "Received 4 parties instead of expected 2"

**Cause:** Parties are being passed both via `@parties` in the request AND via rule automation.

**Solution:** Remove parties from `@parties` that are already defined in `rules.yml`.

### Error: "Multiple extract rules for same protocol"

**Cause:** More than one `extract` rule is defined for a protocol.

**Common Mistake:**

```yaml
# ❌ WRONG - extract assigns logged-in user to BOTH parties
customer:
  extract:
    claims:
      - roles
employee:
  extract:
    claims:
      - roles
```

**Solution:** Use `extract` for ONE party (the logged-in user), use `set` for others:

```yaml
# ✅ CORRECT - logged-in user is customer, employees access via role
customer:
  extract:
    claims:
      - roles
      - email
  require:
    claims:
      roles:
        - customer
employee:
  set:
    claims:
      roles:
        - employee
```

### Error: "R60: Missing required party 'PartyName'"

**Cause:** A party has a `require`-only rule (no `extract`, no `set`), but was not passed in `@parties` by the caller. The engine cannot auto-assign the party — it can only validate claims, not construct the party.

**Solution:** Pass the party in `@parties` with claims that satisfy the `require` constraints:
```typescript
'@parties': {
  PartyName: { claims: { role: ['required-role'] } }
}
```

For seed scripts, the Foundry build system handles this automatically by resolving matching users from `users.json`.

### Error: "set and extract are mutually exclusive"

**Cause:** Both `set` and `extract` are defined for the same party.

**Solution:** Choose one - either `extract` (from token) or `set` (fixed).

## Best Practices

1. **One extract per protocol** - Assign logged-in user to only one party
2. **Use set for known users** - Fixed parties should use `set` with full claims
3. **Use set with role only for generic access** - No email claim = accessible to anyone with that role
4. **Omit variable parties from rules.yml** - Pass them via `@parties` in frontend
5. **Document your approach** - Add comments in `rules.yml` explaining the strategy
6. **Test thoroughly** - Verify party assignment works as expected after migration

## Key Takeaways

- **CRITICAL: `extract` uses different syntax than `set`/`require`**
  - `extract` uses LIST syntax: `claims:` then `- claim-name`
  - `set` and `require` use OBJECT syntax: `claims:` then `claim-name:` then `- value`
- **Claims must match JWT token structure** - Use flat claim names (e.g., `roles`, `email`) that appear in the token after Keycloak mappers
- **Keycloak needs protocol mappers** - To expose `realm_access.roles` as flat `roles` claim, add a `keycloak_openid_user_realm_role_protocol_mapper`
- **Only ONE `extract` per protocol** - The logged-in user can only be assigned to one party
- **`extract` + `require` can be combined** - Extract claims from logged-in user, but require specific values (e.g., role must be "customer")
- **Use `set` for other parties** - Grants access based on role, not tied to the logged-in user's identity
- **Rule automation + explicit `@parties` = combination approach** - Not "either/or" but "both/and"
- **`require` doesn't need to cover all extracted claims** - Only validate the claims you want to restrict
- **What matters is bound claims** - Access control is based on claims bound to the protocol, not just what's in rules.yml
- **Most common pattern:** One `extract` + `require` (logged-in user with role validation) + `set` (other parties by role)
- **Never duplicate** - If a party is in `rules.yml`, don't pass it in `@parties`
