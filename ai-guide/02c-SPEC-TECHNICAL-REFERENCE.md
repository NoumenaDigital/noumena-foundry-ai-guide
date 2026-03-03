# 02c - NPL Technical Reference for Specification

This reference provides the NPL concepts needed when translating business requirements into a structured specification. It covers the type system, naming constraints, and platform capabilities that affect specification decisions.

For full NPL syntax and code-writing details, see `02-NPL-DEVELOPMENT.md`.

---

## 1. Type System

### Primitive Types

| Type | Description | Use when... |
|------|-------------|-------------|
| `Text` | String values (NOT `String`) | Names, descriptions, identifiers, free-form content |
| `Number` | Arbitrary-precision decimal | Amounts, quantities, scores, percentages |
| `Boolean` | true/false | Flags, toggles, binary states |
| `DateTime` | Date + time with timezone | Timestamps, deadlines, event times |
| `LocalDate` | Date without time | Birth dates, effective dates, schedule dates |
| `Duration` | Time duration | Timeouts, SLAs, elapsed time |
| `Period` | Calendar period | Subscription lengths, notice periods |

### Collection & Wrapper Types

| Type | Description | Use when... |
|------|-------------|-------------|
| `List<T>` | Ordered collection, allows duplicates | Line items, history entries, ordered sets of things |
| `Set<T>` | Unordered, unique elements | Tags, categories, unique selections |
| `Map<K, V>` | Key-value pairs | Configurations, lookups, attribute maps |
| `Optional<T>` | Value that may or may not exist | Truly optional fields (NPL has no null) |

### User-Defined Types

| Type | Description | Use when... |
|------|-------------|-------------|
| `struct` | Immutable data shape, no lifecycle | Embedded data (Address, Money, LineItem). Always in `support` package |
| `enum` | Finite set of named values (UPPER_SNAKE_CASE) | Categories, statuses with fixed options. Always in `support` package |
| `union` | Polymorphic type (one of several structs) | Payment types, event variants, result types |
| `identifier` | Opaque auto-generated unique ID | Items in collections that lack natural identity (OrderLineId, CommentId) |
| `symbol` | Number with a unit | Type-safe monetary or unit calculations (usd, eur, kg) |
| Protocol reference | Link to another protocol instance | When one domain object references another (a Bottle references a Wine) |

---

## 2. Reserved Keywords

**CRITICAL**: Never use these as field names, struct field names, parameter names, or enum values. They cause cryptic compile errors downstream.

```
after, and, become, before, between, const, copy, else, enum, false, final,
for, function, guard, identifier, if, in, init, initial, is, match, native,
not, notification, notify, obligation, optional, or, otherwise, package,
permission, private, protocol, require, resume, return, returns, state,
struct, symbol, this, true, union, use, var, vararg, with
```

### Common Traps

These are words that naturally appear in business domains but are reserved in NPL:

| Reserved word | Domain where it appears | Safe alternative |
|---|---|---|
| `state` | Status tracking | `protocolState`, `currentStatus` |
| `return` | Return/refund workflows | `returnRequest`, `returnDate` |
| `match` | Sports, matching, pairing | `matchResult`, `pairing` |
| `resume` | HR, medical, scheduling | `resumeDate`, `resumeDocument` |
| `symbol` | Finance, currencies | `symbolValue`, `currencySymbol` |
| `init` | Initialization tracking | `initDate`, `initialized` |
| `copy` | Document/versioning | `copyCount`, `documentCopy` |
| `protocol` | Audit trails, metadata | `protocolName`, `sourceProtocol` |
| `guard` | Security contexts | `guardName`, `securityGuard` |
| `permission` | Access control | `permissionLevel`, `accessPermission` |
| `package` | Shipping/logistics | `packageInfo`, `shipmentPackage` |
| `notification` | Alert systems | `notificationMessage`, `alertNotification` |
| `union` | Organizations | `unionName`, `laborUnion` |
| `native` | Origin/locale | `nativeLanguage`, `originCountry` |
| `optional` | Requirement tracking | `isOptional`, `optionalFlag` |

---

## 3. Obligations (Timed Actions)

When requirements describe **deadlines**, **SLAs**, or **timeouts**, model them as obligations rather than regular actions.

An obligation is an action that MUST be completed before a deadline. If the deadline passes without the action being taken, the protocol transitions to a fallback state.

**Spec implications:**
- If an action has a deadline, mark it with `"hasDeadline": true` in the spec
- Provide a `deadlineField` (a DateTime field on the protocol) and an `otherwiseState` (the fallback state if the deadline passes)
- The party responsible for the obligation must act before the deadline or the protocol automatically transitions

**Example pattern:** "The buyer must confirm payment within 48 hours, otherwise the order is cancelled."
- Action: `confirmPayment`, party: Buyer, fromState: `awaitingPayment`
- Deadline: 48 hours after creation
- Otherwise: transitions to `cancelled`

---

## 4. Party Automation Constraints

These constraints affect how the specification defines parties on protocols.

### One Extract Per Protocol

Only ONE party per protocol should use `extract` (binding the logged-in user's JWT claims). The logged-in user can only be assigned to one party role when creating a protocol instance.

### Decision Tree

```
Is this party the logged-in user who creates the protocol?
├─ YES → Use extract (+ optional requireClaims for role validation)
│
└─ NO → Is it a system/agent role with fixed identity?
    ├─ YES → Use setClaims (static assignment)
    │
    └─ NO → Is it a role-based party (any user with that role)?
        ├─ YES → Use setClaims with role only (no email)
        │
        └─ NO → No automation (party passed from frontend)
```

### Mutual Exclusivity

- `setClaims` cannot be combined with `extract` or `requireClaims` on the same party
- `extract` + `requireClaims` CAN be combined (extract claims, then validate specific values)
- A party with no automation fields is passed directly from the frontend

### Party Operators on Actions

| Operator | Spec value | Meaning |
|----------|-----------|---------|
| OR (either party can act) | `"partyMode": "or"` (default) | Any one of the listed parties can trigger the action |
| AND (all must cooperate) | `"partyMode": "and"` | ALL listed parties must agree to trigger the action |

Use AND when business logic requires multi-party consent (e.g., both buyer and seller must confirm a trade).

---

## 5. Common Specification Pitfalls

Patterns from production failures that the specification should avoid:

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Using `String` instead of `Text` | NPL compilation fails | Always use `Text` for string fields |
| Using `Type?` for optional fields | NPL has no nullable types | Use `Optional<Type>` wrapper |
| `requireClaims` on non-creating party | Blocks protocol creation for all users | Only require claims on the party that initiates creation |
| Reserved keyword as field name | Cryptic syntax errors in generated code | Check field names against the reserved keywords list above |
| Protocol without states | Generates a flat data record, not a lifecycle | Every protocol should have initial + at least one final state |
| Missing protocol reference | Using Text IDs instead of typed references | When one object references another, use the protocol name as the field type |
