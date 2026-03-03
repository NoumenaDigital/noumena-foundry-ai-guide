# 02b - NPL Unit Testing Guide

## Overview

This guide covers creating NPL unit tests to validate protocol logic.

## Test File Organization

```
npl/src/test/npl/yourpackage/YourProtocolTests.npl
```

## Unique Function Names Across Test Files

**All test function names must be globally unique within the same package.** If two test files in the same package define a function with the same name, the NPL compiler will fail with a duplicate symbol error.

This applies to both `@test` functions and helper functions. Since all `.npl` files in a package share a single namespace, a function named `test_creation` in `WineTests.npl` will collide with a function named `test_creation` in `BottleTests.npl` if both files declare `package yourpackage`.

**Best practice:** Prefix test function names with the protocol or concept being tested:

```npl
// In WineTests.npl
@test
function test_wine_creation(test: Test) -> { ... };

// In BottleTests.npl
@test
function test_bottle_creation(test: Test) -> { ... };
```

The same rule applies to helper functions:

```npl
// ❌ WRONG - both files define createAndSetup → duplicate symbol error
// WineTests.npl
function createAndSetup(test: Test) returns Wine -> { ... };
// BottleTests.npl
function createAndSetup(test: Test) returns Bottle -> { ... };

// ✅ CORRECT - unique names
// WineTests.npl
function createAndSetupWine(test: Test) returns Wine -> { ... };
// BottleTests.npl
function createAndSetupBottle(test: Test) returns Bottle -> { ... };
```

## Test Syntax

```npl
package yourpackage

@test
function test_example(test: Test) -> {
    var protocol = YourProtocol['party1', 'party2'](param1);
    test.assertEquals(expected, protocol.field, "message");
};
```

## Assertions

- `test.assertEquals(expected, actual, message)`
- `test.assertFails(function() -> ..., message)`
- `test.assertTrue(condition, message)`
- `test.assertFalse(condition, message)`

## Checking Protocol State in Tests

Use `activeState().getOrFail()` to get the current state and compare it against the `States` enum. **Important:** Since tests are outside the protocol, you must qualify the `States` enum with the protocol name.

```npl
@test
function test_state_after_action(test: Test) -> {
    var order = Order['buyer', 'seller'](100);
    order.confirm['seller']();

    // ✅ CORRECT - Qualify States with the protocol name (required outside the protocol)
    test.assertTrue(
        order.activeState().getOrFail() == Order.States.confirmed,
        "Order should be in confirmed state"
    );
};
```

**Common mistakes in tests:**

```npl
// ❌ WRONG - Unqualified States (only works inside the protocol body, not in tests)
test.assertTrue(order.activeState().getOrFail() == States.confirmed, "...");

// ❌ WRONG - Quoted state name on States enum
test.assertTrue(order.activeState().getOrFail() == Order.States."confirmed", "...");

// ❌ WRONG - Comparing Optional directly (activeState() returns Optional<State>)
test.assertTrue(order.activeState() == Order.States.confirmed, "...");

// ❌ WRONG - Using a non-existent property
test.assertTrue(order.currentState == "confirmed", "...");

// ❌ WRONG - Using 'in' keyword for state check
test.assertTrue(order in confirmed, "...");
```

**Key rules:**
- `activeState()` returns `Optional<State>` — always call `.getOrFail()` before comparing
- **Outside** the protocol (tests): qualify as `ProtocolName.States.stateName`
- **Inside** the protocol body: plain `States.stateName` is sufficient
- No quotes around the state name
- The `States` enum is auto-generated from the protocol's `state` declarations
- Do **not** use `currentState` as a manually-tracked Text variable — it is a built-in

## Protocol Instantiation in Tests

When constructing protocol instances in tests, you must use correct NPL constructor functions for collections and optionals. This is the **#1 source of test compilation errors** — the AI frequently falls back to Java/JavaScript syntax.

### Non-Negotiable Constructor Signature Rules

- **Never assume constructor signatures.** Always copy them from the exact current `protocol[...] Name(var ...)` declaration.
- Only values from the protocol constructor parameter list are valid constructor arguments.
- Variables declared inside the protocol body (for example `var notes = ...` or `private var eventLog = ...`) are **not** constructor parameters unless they are also declared in the protocol header.
- If you pass one extra field (such as `notes`) that is not in the constructor signature, compilation will fail with argument-count errors.
- Treat generated tests as potentially stale after any protocol signature change.

### Constructor Mapping Workflow (Required)

Before writing or fixing protocol instantiation in tests:

1. Open the protocol declaration (`protocol[...] Name(var ...)`) in source.
2. Copy the full constructor parameter list in declaration order (name + type).
3. Build the test instantiation from that list only.
4. Confirm argument count equals constructor parameter count.
5. Confirm each argument type matches exactly (`List`/`Optional` included).

If the protocol changed, re-check every helper factory that instantiates that protocol.

### Correct Instantiation Pattern

Given this protocol:

```npl
@api
protocol[pOwner, pManager, pUser, pGuest, pAuditor, pSysAdmin, pService] Wine(
    var cellarId: Text,
    var producer: Text,
    var vintage: Number,
    var grapeVarieties: List<Text>,
    var region: Optional<Text>,
    var alcoholPercent: Optional<Number>,
    var tastingNotes: Optional<TastingNotes>,
    var foodPairings: List<Text>,
    var externalReferences: List<ExternalReference>,
    var isCuratedForGuests: Boolean
) { ... }
```

The **correct** test instantiation:

```npl
@test
function test_wine_creation(test: Test) -> {
    var wine = Wine[
        'owner', 'manager', 'user', 'guest', 'auditor', 'sysadmin', 'service'
    ](
        "cellar-001",                              // cellarId: Text
        "Chateau Example",                         // producer: Text
        2019,                                      // vintage: Number
        listOf("Cabernet Sauvignon", "Merlot"),    // grapeVarieties: List<Text> — NOT ["Cab", "Merlot"]
        optionalOf("Bordeaux"),                    // region: Optional<Text> — NOT Optional.of("Bordeaux")
        optionalOf(13.5),                          // alcoholPercent: Optional<Number> — NOT Optional.of(13.5)
        optionalOf<TastingNotes>(),                // tastingNotes: Optional<TastingNotes> — NOT Optional.empty()
        listOf<Text>(),                            // foodPairings: List<Text> — NOT []
        listOf<ExternalReference>(),               // externalReferences: List<ExternalReference> — NOT []
        false                                      // isCuratedForGuests: Boolean
    );

    test.assertEquals("cellar-001", wine.cellarId, "Cellar ID should match");
    test.assertTrue(wine.region.isPresent(), "Should have region");  // NOT .isDefined()
    test.assertFalse(wine.tastingNotes.isPresent(), "Should not have tasting notes");
};
```

### Common Instantiation Mistakes in Tests

These patterns compile in other languages but **cause syntax errors in NPL**:

| ❌ Wrong (causes compile error) | ✅ Correct NPL | Parameter type |
|---|---|---|
| `[]` | `listOf<BottleEvent>()` | `List<BottleEvent>` (empty) |
| `["Merlot", "Syrah"]` | `listOf("Merlot", "Syrah")` | `List<Text>` (with items) |
| `Optional.of("Bordeaux")` | `optionalOf("Bordeaux")` | `Optional<Text>` (present) |
| `Optional.of(13.5)` | `optionalOf(13.5)` | `Optional<Number>` (present) |
| `Optional.empty()` | `optionalOf<Text>()` | `Optional<Text>` (empty) |
| `Optional.empty()` | `optionalOf<Number>()` | `Optional<Number>` (empty) |
| `LocalDate(2024, 1, 15)` | `localDateOf(2024, 1, 15)` | `LocalDate` |
| `DateTime(...)` / `dateTime(...)` | `dateTimeOf(2025, 6, 15, 10, 30, 0, 0, "UTC")` | `DateTime` |
| `myOpt.isDefined()` | `myOpt.isPresent()` | Checking Optional |

**Key rule:** The type parameter on empty constructors must match the expected type. An empty `Optional<Number>` is `optionalOf<Number>()`, not `optionalOf<Text>()`.

### E0035 Quick Diagnosis (Argument Count Mismatch)

If you see an error like:

```text
E0035: Provided X arguments, but expected Y
```

check in this order:

1. Constructor signature drift: test still uses an older protocol signature.
2. Extra non-constructor fields were passed (for example body variables such as `notes`).
3. Missing constructor arguments after protocol evolution.
4. Wrong constructor target due to copy/paste from another protocol.

Do **not** guess argument order. Rebuild the call from the current protocol declaration.

### Struct Instantiation in Tests

Structs with Optional fields follow the same rules:

```npl
// ❌ WRONG
var location = StorageLocation("ZoneA", Optional.of("Rack1"), Optional.empty());

// ✅ CORRECT
var location = StorageLocation("ZoneA", optionalOf("Rack1"), optionalOf<Text>());
```


## Pre-Test Instantiation Checklist

Before running `mvn test`, validate:

- Every protocol test constructor matches the current `protocol[...] Name(var ...)` signature exactly.
- No protocol body variables are passed as constructor arguments.
- `List` values use `listOf(...)` / `listOf<Type>()` (never `[]`).
- `Optional` values use `optionalOf(...)` / `optionalOf<Type>()` (never `Optional.of`, `Optional.empty`, or `null`).
- Helper factory functions were updated after any protocol signature change.

## Functions with Return Types in Tests

Test files may include helper functions that declare `returns Type`. When they do, you **must** use an explicit `return` statement to return the value. Forgetting the `return` keyword causes `E0015: Missing return statement`.

```npl
// ❌ WRONG - no return statement → E0015
function createAndConfirmOrder(test: Test) returns Order -> {
    var order = Order['buyer', 'seller'](100);
    order.confirm['seller']();
};

// ❌ WRONG - variable as last expression without return → E0015
function createAndConfirmOrder(test: Test) returns Order -> {
    var order = Order['buyer', 'seller'](100);
    order.confirm['seller']();
    order;
};

// ✅ CORRECT - explicit return statement
function createAndConfirmOrder(test: Test) returns Order -> {
    var order = Order['buyer', 'seller'](100);
    order.confirm['seller']();
    return order;
};
```

Functions without a `returns` clause (including most `@test` functions) return Unit implicitly — no `return` statement is needed.


## Running Tests

```bash
cd npl && mvn test
```
