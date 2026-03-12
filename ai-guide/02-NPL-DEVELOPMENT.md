# 02 - NPL Development Guide

## Overview

This guide covers **developing NPL protocols** that will be used to generate the complete application. It includes:
- Protocol structure and best practices
- Party declarations (for Keycloak role generation)
- `@api` annotations (for API generation)
- Frontend commenting conventions (for UI generation)
- State management patterns
- Permission and obligation patterns

## NPL Package Organization

### Directory Structure

Within the NPL source directory (e.g., `npl-1.0.0/`), organize code into **multiple packages** (subdirectories). Each package corresponds to a `package` statement at the top of the NPL files within it.

```
npl/src/main/npl-1.0.0/
├── support/                    # Shared types package (always present if types exist)
│   ├── structs.npl            # All struct definitions
│   ├── enums.npl              # All enum definitions
│   ├── functions.npl          # Utility/helper functions
│   ├── unions.npl             # Union type definitions (if any)
│   ├── symbols.npl            # Symbol definitions (if any, e.g., currencies)
│   └── identifiers.npl        # Identifier type definitions (if any)
│
├── <domain-area-1>/           # Logically grouped protocols
│   ├── ProtocolA.npl
│   └── ProtocolB.npl
│
└── <domain-area-2>/           # Another logical grouping
    ├── ProtocolC.npl
    └── ProtocolD.npl
```

### Package Guidelines

1. **Logical Grouping**: Group related protocols by domain area, not one protocol per package (causes too many imports) and not all protocols in one package (poor organization).

2. **Support Package**: Always create a `support` package for shared type definitions. This keeps protocols clean and focused on business logic.

3. **Conditional Support Files**: Only include support files for types actually used in the project:

   | File | Include when... |
   |------|-----------------|
   | `structs.npl` | You have struct definitions |
   | `enums.npl` | You have enum definitions |
   | `functions.npl` | You have shared utility functions |
   | `unions.npl` | You have union type definitions |
   | `symbols.npl` | You have symbol definitions (currencies, units) |
   | `identifiers.npl` | You have identifier type definitions |

4. **Package Statements**: The `package` statement must be a **single, dot-free name** that matches the directory the file is in. **Never** include dots, sub-paths, or the filename in the package declaration:

   ```npl
   // File: npl-1.0.0/support/structs.npl
   package support          // ✅ Matches the directory name 'support'
   // package support.structs  ← ❌ WRONG: no dots allowed, filename is NOT part of package
   
   struct Address {
       street: Text,
       city: Text,
       country: Text
   };
   ```

5. **Imports**: Use `use` statements to import from other packages. The import path is `<package>.<TypeName>` — the **filename is never part of the import path**. Each type must be imported individually:

   ```npl
   // File: npl-1.0.0/orders/Order.npl
   package orders

   // Import specific types from the support package
   use support.Address;
   use support.OrderStatus;

   // ❌ Wildcard imports are NOT supported:
   // use support.*;  // Causes: mismatched input '*' expecting IDENTIFIER

   @api
   protocol[buyer, seller] Order(...) { ... };
   ```

### Example: E-Commerce Application

```
npl/src/main/npl-1.0.0/
├── support/
│   ├── structs.npl            # Address, Money, LineItem, etc.
│   ├── enums.npl              # OrderStatus, PaymentMethod, etc.
│   └── functions.npl          # calculateTotal(), formatCurrency(), etc.
│
├── catalog/
│   ├── Product.npl            # Product protocol
│   └── Category.npl           # Category protocol
│
├── orders/
│   ├── Order.npl              # Order protocol
│   └── Return.npl             # Return/refund protocol
│
└── customers/
    ├── Customer.npl           # Customer protocol
    └── Address.npl            # Address management protocol
```

### Anti-Patterns to Avoid

❌ **One protocol per package** - Creates excessive import statements
```
npl-1.0.0/
├── order/Order.npl
├── product/Product.npl
├── customer/Customer.npl
└── ...  # Too fragmented
```

❌ **All code in one file** - Poor maintainability, hard to navigate
```
npl-1.0.0/
└── myapp/
    └── AllProtocols.npl  # Everything in one file - bad practice
```

❌ **Mixing types with protocols** - Clutters protocol files
```npl
package myapp

// Don't mix structs/enums with protocols in same file
struct Item { ... };
enum Status { ... };

@api
protocol[owner] Order(...) { ... };
```

❌ **Using dots in package names or filenames in import paths** - Causes compile errors
```npl
// WRONG: Package name must NOT contain dots
package support.structs   // ❌ NPL does not allow dots in package names!

// WRONG: Do NOT include the filename in import paths
use support.structs.Address;    // ❌ 'structs' is the filename, not a sub-package
use support.enums.OrderStatus;  // ❌ 'enums' is the filename, not a sub-package
use support.structs.*;           // ❌ Same mistake with wildcard

// CORRECT: Import path is <package>.<TypeName> — the filename is irrelevant
use support.Address;            // ✅ Imports Address from the 'support' package
use support.OrderStatus;        // ✅ Imports OrderStatus from the 'support' package
// NOTE: Wildcard imports (use support.*;) are NOT supported — import each type individually
```

**Why this happens:** Multiple files (`structs.npl`, `enums.npl`, etc.) can live in the same directory and all declare `package support`. The filename is just for developer organization — NPL resolves imports by **package name + type name**, never by filename.

✅ **Correct approach** - Separate support types from protocols
```npl
// support/structs.npl
package support
struct Item { ... };

// support/enums.npl  
package support
enum Status { ... };

// orders/Order.npl
package orders
use support.Item;
use support.Status;
@api
protocol[owner] Order(...) { ... };
```

### Support File Contents

#### `structs.npl` - Data Structures
```npl
package support

/**
 * Represents a physical address
 */
struct Address {
    street: Text,
    city: Text,
    postalCode: Text,
    country: Text
};

/**
 * Represents a monetary amount with currency
 */
struct Money {
    amount: Number,
    currency: Text
};
```

#### `enums.npl` - Enumeration Types
```npl
package support

/**
 * Order status values
 */
enum OrderStatus {
    Pending,
    Processing,
    Shipped,
    Delivered,
    Cancelled
};

/**
 * Payment methods
 */
enum PaymentMethod {
    CreditCard,
    BankTransfer,
    PayPal
};
```

#### `functions.npl` - Utility Functions
```npl
package support

/**
 * Calculates the total from a list of line items
 * @param items The list of line items
 * @return The total amount
 */
function calculateTotal(items: List<LineItem>) returns Number -> 
    items.map(function(item: LineItem) -> item.quantity * item.unitPrice).sum();

/**
 * Validates an email format (basic check)
 * @param email The email to validate
 * @return True if email contains @
 */
function isValidEmail(email: Text) returns Boolean -> 
    email.length() > 3;
```

#### `unions.npl` - Union Types (if needed)
```npl
package support

/**
 * Payment can be either a card payment or bank transfer
 */
union Payment {
    CardPayment,
    BankTransfer
};

struct CardPayment {
    cardNumber: Text,
    expiryDate: Text
};

struct BankTransfer {
    accountNumber: Text,
    bankCode: Text
};
```

#### `symbols.npl` - Symbol Types (if needed)
```npl
package support

/**
 * Currency symbols for type-safe monetary calculations
 */
symbol usd;
symbol eur;
symbol gbp;
```

#### `identifiers.npl` - Identifier Types (if needed)

Identifiers are **opaque, auto-generated unique IDs** useful for items in collections that lack natural identity.

```npl
package support

/**
 * Unique identifier for order line items
 */
identifier OrderLineId;

/**
 * Unique identifier for comments
 */
identifier CommentId;

/**
 * Unique identifier for attachments
 */
identifier AttachmentId;
```

**Usage:**
```npl
struct OrderLine {
    id: OrderLineId,        // Auto-generated unique ID
    productName: Text,
    quantity: Number
};

// Creating with auto-generated ID
var line = OrderLine(
    id = OrderLineId(),     // Generates unique value automatically
    productName = "Widget",
    quantity = 5
);

// Identifiers can be compared
var id1 = OrderLineId();
var id2 = OrderLineId();
id1 == id2;  // false - each is unique
```

**Key characteristics of identifiers:**
- Values are randomly generated when instantiated (no arguments needed)
- Opaque - cannot convert to text with `.toText()`
- Type-safe - can only compare identifiers of the same type
- Ideal for giving identity to items in collections

---

## Protocol Structure

### Basic Protocol Template

```npl
package yourpackage

/**
 * Protocol Description
 * @param paramName Description of parameter
 */
@api
protocol[party1, party2] ProtocolName(
    var param1: Text,
    var param2: Number
) {
    initial state created;
    state active;
    final state completed;
    
    // Protocol body with permissions, obligations, etc.
}
```

### Key Elements

1. **Package Declaration** - Organizes protocols (used for sidebar grouping)
2. **@api Annotation** - Marks protocol for API generation
3. **Party Declarations** - Defines roles (used for Keycloak role generation)
4. **Parameters** - Used for creation forms
5. **States** - Protocol lifecycle
6. **Variables** - Displayed on detail pages
7. **Permissions/Obligations** - Become action buttons

## Party Declarations

Parties in protocol signatures define **roles** in the system:

```npl
protocol[admin, trainer, guest] DogTraining(...)
```

**Naming Convention:**
- Use camelCase party names (e.g., `relationshipManager`)
- Use descriptive names based on business context
- These map directly to Keycloak role names

**Example from Context:**
```
"Create a dog training app with 3 roles (admin, trainer, guest)"
```

**NPL Protocol:**
```npl
protocol[admin, trainer, guest] DogTraining(...)
```

**Generated Keycloak Roles:**
- `admin`
- `trainer`
- `guest`

## @api Annotation

Mark protocols with `@api` to generate API endpoints:

```npl
@api
protocol[bank, client] Account(...)
```

**What gets generated:**
- REST API endpoints
- OpenAPI specification
- TypeScript types
- Frontend API client

## Frontend Commenting Conventions

NPL protocols should include **inline comments** that provide context for frontend generation. These comments help the AI understand:
- How to display protocol variables
- What UI components to use
- How to organize information on detail pages
- What labels and descriptions to use

## Comment Format

Use **inline comments** directly after variable declarations:

```npl
protocol[bank, client] DogTraining(
    // @frontend: Display as main title in detail page header
    var dogName: Text,
    
    // @frontend: Display in "Basic Information" section as read-only text
    // @frontend: Label: "Owner Name"
    var ownerName: Text,
    
    // @frontend: Display in "Training Progress" section as table
    // @frontend: Table columns: Command, Status, Date Learned, Proficiency
    // @frontend: Format: Status as chip (green=learned, yellow=in-progress, red=not-started)
    var learnedCommands: List<Command>,
    
    // @frontend: Display in "Training Progress" section as KPI card
    // @frontend: Format: Large number with percentage, color based on value (green if >80%)
    // @frontend: Label: "Overall Progress"
    var overallProgress: Number,
    
    // @frontend: Display in "Schedule" section as calendar/date picker
    // @frontend: Format: Date picker for scheduling next training session
    var nextTrainingDate: LocalDate,
    
    // @frontend: Display in "Basic Information" section as dropdown
    // @frontend: Options: "Puppy", "Adult", "Senior"
    // @frontend: Label: "Age Category"
    var ageCategory: Text
) {
    // Protocol body...
}
```

## Comment Tags

### @frontend: Display location
Specifies where to display the variable on the detail page:

- `@frontend: Display in "Section Name" section` - Creates a named section
- `@frontend: Display as main title` - Used in page header
- `@frontend: Display in sidebar` - Additional info in sidebar
- `@frontend: Display in summary card` - KPI/summary card

### @frontend: Component type
Specifies what UI component to use:

- `@frontend: Format: text` - Plain text
- `@frontend: Format: table` - Data table
- `@frontend: Format: chip` - Status chip
- `@frontend: Format: date picker` - Date input
- `@frontend: Format: dropdown` - Select dropdown
- `@frontend: Format: number input` - Number input
- `@frontend: Format: currency` - Currency amount with formatting
- `@frontend: Format: percentage` - Percentage with formatting
- `@frontend: Format: chart` - Data visualization

### @frontend: Label
Custom label for the field:

```npl
// @frontend: Label: "Custom Field Name"
var fieldName: Text
```

### @frontend: Options
For dropdowns/enums, specify options:

```npl
// @frontend: Format: dropdown
// @frontend: Options: "Option1", "Option2", "Option3"
var status: Text
```

### @frontend: Table columns
For List/Set types displayed as tables:

```npl
// @frontend: Format: table
// @frontend: Table columns: Column1, Column2, Column3
var items: List<Item>
```

### @frontend: Color/Status mapping
For status fields with color coding:

```npl
// @frontend: Format: chip
// @frontend: Color mapping: "active"=green, "pending"=yellow, "inactive"=red
var status: Text
```

### @frontend: Read-only
Mark fields as read-only:

```npl
// @frontend: Display in "Information" section as read-only text
var id: Text
```

## Section Organization

Variables with the same section name are grouped together:

```npl
protocol[bank] Example(
    // @frontend: Display in "Basic Information" section
    var name: Text,
    
    // @frontend: Display in "Basic Information" section
    var description: Text,
    
    // @frontend: Display in "Financial Details" section
    var amount: Number,
    
    // @frontend: Display in "Financial Details" section
    var currency: Currency
) {
    // All "Basic Information" fields appear together
    // All "Financial Details" fields appear together
}
```

## Default Behavior

If no `@frontend` comments are provided:
- Variables are displayed in a default "Details" section
- Text fields use plain text display
- Numbers use number formatting
- Dates use date formatting
- Lists/Sets use table display
- Booleans use checkbox/switch display

## Example: Complete Protocol with Comments

```npl
package dogtraining

/**
 * Dog Training Protocol
 * @param dogName The name of the dog being trained
 * @param ownerName The name of the dog's owner
 */
@api
protocol[admin, trainer, guest] DogTraining(
    // @frontend: Display as main title in detail page header
    var dogName: Text,
    
    // @frontend: Display in "Owner Information" section
    // @frontend: Label: "Owner Name"
    var ownerName: Text,
    
    // @frontend: Display in "Owner Information" section
    // @frontend: Label: "Owner Email"
    var ownerEmail: Text,
    
    // @frontend: Display in "Training Progress" section as table
    // @frontend: Table columns: Command, Status, Date Learned, Proficiency Score
    // @frontend: Format: Status as chip (green=learned, yellow=in-progress, red=not-started)
    var learnedCommands: List<Command>,
    
    // @frontend: Display in "Training Progress" section as KPI card
    // @frontend: Format: Large number with percentage, color green if >80%, yellow if 50-80%, red if <50%
    // @frontend: Label: "Overall Progress"
    var overallProgress: Number,
    
    // @frontend: Display in "Schedule" section as date picker
    // @frontend: Label: "Next Training Session"
    var nextTrainingDate: LocalDate,
    
    // @frontend: Display in "Basic Information" section as dropdown
    // @frontend: Options: "Puppy", "Adult", "Senior"
    // @frontend: Label: "Age Category"
    var ageCategory: Text,
    
    // @frontend: Display in "Basic Information" section as chip
    // @frontend: Color mapping: "active"=green, "on-hold"=yellow, "completed"=blue
    // @frontend: Label: "Training Status"
    var trainingStatus: Text
) {
    initial state created;
    state inProgress;
    final state completed;
    
    // @frontend: Display in "Training History" section as table
    // @frontend: Table columns: Date, Trainer, Command, Result, Notes
    private var trainingHistory: List<TrainingSession> = listOf<TrainingSession>();
    
    // @frontend: Display in "Statistics" section as KPI cards
    // @frontend: Format: Number with label "Total Sessions"
    private var totalSessions: Number = 0;
    
    // Protocol permissions...
}
```

## Best Practices

1. **Be specific** - Use clear section names and component types
2. **Group related fields** - Use the same section name for related variables
3. **Use meaningful labels** - Override default labels when needed
4. **Specify formats** - Indicate currency, percentage, date formats
5. **Document status mappings** - For status fields, specify color mappings
6. **Table column names** - For List/Set types, specify column headers

## Protocol Development Best Practices

### 1. State Management
- Use clear state names: `created`, `active`, `completed`
- Mark `initial state` and `final state` appropriately
- State transitions should be meaningful
- Do not duplicate protocol lifecycle in a separate status variable (for example `lifecycleStatus`) when it just mirrors protocol states
- If something needs its own independent lifecycle, model it as its own protocol rather than encoding a second lifecycle on another protocol

### 2. Permission Patterns
- Use `@api` for permissions that need frontend buttons
- Include `require()` statements for business logic validation
- State constraints in permission signature (e.g., `| created, active`)

### 3. Party Organization
- Group related parties together
- Use consistent naming across protocols
- Document party responsibilities in comments

### 4. Variable Organization
- Group related variables logically
- Use `@frontend` comments to organize into sections
- Mark private variables that shouldn't be displayed

---

## NPL Syntax Rules & Common Pitfalls

This section documents critical NPL syntax rules that differ from common programming conventions. **Follow these rules strictly** to avoid compilation errors.

### 1. No Nullable Types with `?` Suffix

NPL does **NOT** support the `Type?` syntax for nullable/optional types.

```npl
// ❌ WRONG - Will cause syntax errors
var title: Text?
var endDate: LocalDate?

// ✅ CORRECT - Use default initialization
var title: Text = "";
var endDate: LocalDate = startDate;
```

**Rule:** All variables must be initialized with a default value. There is no `null` in NPL.

### 2. Multi-Party Permissions with Parameters

When a permission has **parameters**, you **cannot** use comma-separated parties. You must create separate permissions for each party.

```npl
// ❌ WRONG - Syntax error with parameters and multiple parties
permission[owner, trainer] updateProgress(score: Number) | active {
    // ...
};

// ✅ CORRECT - Separate permissions for each party
permission[owner] updateProgressAsOwner(score: Number) | active {
    this.score = score;
};

permission[trainer] updateProgressAsTrainer(score: Number) | active {
    this.score = score;
};
```

**Exception:** Permissions **without** parameters can use multiple parties in the protocol signature:

```npl
// ✅ CORRECT - No parameters, multiple parties allowed
permission[owner] archive() | active {
    become archived;
};
```

### 3. Permission Parameters Do Not Use `var`

Protocol constructor parameters use `var` (they declare mutable state), but permission action parameters do **not** — they are input arguments:

```npl
// Protocol constructor — uses var (these become protocol state)
protocol[admin] MyProtocol(var name: Text, var startDate: LocalDate) {
    // ...

    // ❌ WRONG — permission parameters must NOT use var
    permission[admin] rename(var newName: Text) | active {
        name = newName;
    };

    // ✅ CORRECT — no var keyword
    permission[admin] rename(newName: Text) | active {
        name = newName;
    };
};
```

### 4. Permission Signature Order

The permission signature must follow this exact order:

```npl
// ✅ CORRECT ORDER
permission[party] actionName(params) returns ReturnType | stateConstraint {
    // body
};

// ❌ WRONG - State constraint before return type
permission[party] actionName(params) | stateConstraint returns ReturnType {
    // body
};
```

### 4. State Transitions in `if` Statements

State transitions (`become`) inside `if` blocks require careful syntax:

```npl
// ✅ CORRECT - Separate if statements for state transitions
if (newStatus == "in_training") become inTraining;
if (newStatus == "reliable") become reliable;
if (newStatus == "proofed") become proofed;

// ❌ AVOID - Complex conditionals with become inside blocks
if (newStatus == "in_training") { become inTraining; }
else if (newStatus == "reliable") { become reliable; };
```

### 5. Variable Initialization Required

All variables **must** be initialized when declared:
Visibility (`var` vs `private var`) is orthogonal — both follow the same initialization rule.

```npl
// ❌ WRONG - Uninitialized variable
var bookingTime: DateTime;

// ✅ CORRECT - Variable with initialization
var bookingTime: DateTime = now();
var summaryText: Text = "";
var count: Number = 0;
```

### 6. Text Type, Not String

NPL uses `Text`, not `String`:

```npl
// ❌ WRONG
var name: String

// ✅ CORRECT
var name: Text
```

### 6b. Text Concatenation

Use the `+` operator or the `.plus()` method to concatenate Text values. Non-Text values (Number, DateTime, Boolean, etc.) must be converted with `.toText()` before concatenation.

```npl
// ✅ CORRECT — Use the + operator for Text concatenation
var message = "Hello, " + userName + "! You have " + count.toText() + " items.";

// ✅ ALSO CORRECT — Use the .plus() method
var message = "Hello, ".plus(userName).plus("! You have ").plus(count.toText()).plus(" items.");
```

**Common patterns:**

```npl
// Concatenating Text values
var fullName = firstName + " " + lastName;

// Converting numbers to text
var label = "Total: " + totalAmount.toText();

// Building multi-part messages
var summary = "Order #" + orderId + " — " + itemCount.toText() + " items, " + status;

// In require() messages
require(amount > 0, "Amount must be positive, got: " + amount.toText());
```

### 6c. Protocol Body Is Declarations-Only

At protocol top level (directly inside `protocol { ... }`), use declarations only:
- `require(...)`
- state declarations (`initial state`, `state`, `final state`)
- variable declarations (`var` / `private var`)
- `init { ... }`
- functions/permissions/obligations/notifications

Do **not** place standalone control flow like `if`, `match`, or `for` directly in protocol body.
Put control flow inside `init`, `function`, `permission`, or `obligation` blocks.

```npl
// ❌ WRONG - top-level control flow in protocol body
protocol[p] Example(var amount: Number) {
    if (amount > 0) {                    // not allowed here
        require(amount < 100, "Too big");
    };
};

// ✅ CORRECT - validation as top-level require declarations
protocol[p] Example(var amount: Number) {
    require(amount > 0, "Must be positive");
    require(amount < 100, "Too big");
};
```

### 6d. Use `var`, Never `val`

NPL variable declarations use `var` (and `private var`), including local variables inside permissions/functions.
Do not use `val`.

```npl
// ❌ WRONG
val total: Number = amount + fee;

// ✅ CORRECT
var total: Number = amount + fee;
```

### 6e. Initialization Source Must Be Explicit

For every protocol variable, the source of its initial value must be explicit:
- either initialized at declaration in protocol body
- or provided via protocol constructor parameter

The guide enforces this structural rule but does **not** prescribe business defaults.
Business-specific initial values must come from the technical/business specification for the application.

### 7. Punctuation Rules (Semicolons and Commas)

Every **statement** in NPL must end with `;`. This includes:
- `require(...)` statements
- assignments
- state transitions (`become ...;`)
- `return` statements inside blocks
- the closing `};` after block-based statements (such as `if { ... };`, `permission { ... };`, `init { ... };`)

```npl
// ✅ CORRECT - semicolons on every statement
require(amount > 0, "Amount must be positive");
title = newTitle;
become completed;

if (amount > 0) {
    return true;
};
```

```npl
// ❌ WRONG - missing semicolons (very common AI mistake)
require(amount > 0, "Amount must be positive")
title = newTitle

if (amount > 0) {
    return true
}
```

**Important distinction:**
- Use semicolons `;` for statements
- Use commas `,` between struct fields

```npl
// ✅ CORRECT - struct fields use commas, not semicolons
struct Item {
    id: Text,
    price: Number
};
```

### 8. Protocol-Level Type Definitions

Structs, enums, and unions must be defined **outside** protocols at the package level:

```npl
// ✅ CORRECT - Type definition outside protocol
package mypackage

struct Item {
    name: Text,
    price: Number
};

protocol[owner] Order(var items: List<Item>) {
    // ...
};

// ❌ WRONG - Type definition inside protocol
protocol[owner] Order() {
    struct Item { ... };  // Syntax error
};
```

### 9. Struct Field Syntax (Definition)

Struct fields use **commas**, not semicolons, and **no** `var` keyword:

```npl
// ❌ WRONG
struct Item {
    var id: Text;
    var price: Number;
};

// ✅ CORRECT
struct Item {
    id: Text,
    price: Number
};
```

### 10. Struct Instantiation Syntax

**CRITICAL:** When creating struct instances, use parentheses `()` with `=` for field assignment, NOT curly braces `{}` with `:`.

```npl
// ❌ WRONG - JavaScript/JSON-style syntax (will cause syntax errors)
var entry = ActivityLogEntry {
    timestamp: now(),
    action: "Created",
    performedBy: "user@example.com"
};

// ✅ CORRECT - NPL uses parentheses and equals sign
var entry = ActivityLogEntry(
    timestamp = now(),
    action = "Created",
    performedBy = "user@example.com"
);
```

**Full Example:**

```npl
// Struct definition (uses colons)
struct Comment {
    commentId: Text,
    author: Text,
    content: Text,
    createdAt: DateTime
};

// Struct instantiation (uses parentheses and equals)
var newComment = Comment(
    commentId = "123",
    author = "user@example.com",
    content = "This is a comment",
    createdAt = now()
);

// Adding to a list
comments = comments.with(
    Comment(
        commentId = now().toText(),
        author = authorEmail,
        content = content,
        createdAt = now()
    )
);
```

### 11. Protocol Variable Access (No `this.` Required)

When accessing protocol variables within permissions, the `this.` prefix is **not required** (unlike languages like Java/TypeScript).

```npl
protocol[owner] Example(var title: Text) {
    private var updatedAt: DateTime = now();
    
    permission[owner] updateTitle(newTitle: Text) | active {
        // ❌ WRONG - Unnecessary this. prefix
        this.title = newTitle;
        this.updatedAt = now();
        
        // ✅ CORRECT - Direct variable access
        title = newTitle;
        updatedAt = now();
    };
};
```

**Note:** The `this.` prefix is valid but unnecessary and should be avoided for cleaner code.

### 12. State Comparisons and the `currentState` Built-in

NPL protocols have a **built-in** `currentState` property. **Never** declare your own variable named `currentState` — it will cause error `E0020: Attempt to redefine 'currentState', already defined at '<builtin>'`.

To check a protocol's active state, use `activeState()` which returns `Optional<State>`. Unwrap it before comparing, and reference states via the `States` enum:

```npl
// ✅ CORRECT - Inside the protocol itself, use States directly
if (activeState().getOrFail() == States.pending) {
    // ...
};

// ✅ CORRECT - Outside the protocol (e.g., in tests), qualify with the protocol name
var isActive = myProtocol.activeState().getOrFail() == MyProtocol.States.active;
```

**Common mistakes:**

```npl
// ❌ WRONG - Declaring a variable named currentState (conflicts with built-in)
private var currentState: Text = "sealed";

// ❌ WRONG - Comparing with a quoted string on the States enum
activeState().getOrFail() == States."opened"

// ❌ WRONG - Comparing Optional directly without unwrapping
activeState() == States.opened

// ❌ WRONG - Manually tracking state as a Text variable
currentState = "completed";  // Redundant; use become instead
become completed;
```

**Key rules:**
- State is managed by `become` statements — never track it manually in a Text variable
- `activeState()` returns `Optional<State>` — always unwrap with `getOrFail()` before comparing
- **Inside** the protocol: reference state constants as `States.stateName`
- **Outside** the protocol (e.g., in tests): qualify with the protocol name as `ProtocolName.States.stateName`
- No quotes around the state name
- The `States` enum is auto-generated from your `state` declarations

### 13. Reserved Keywords

**CRITICAL:** Never use these as field names (in structs), variable names, or parameter names. The NPL parser will interpret them as language constructs, producing confusing syntax errors like `missing '}'` or `mismatched input`.

**Full list of reserved keywords:**

`after`, `and`, `become`, `before`, `between`, `const`, `copy`, `else`, `enum`, `false`, `final`, `for`, `function`, `guard`, `identifier`, `if`, `in`, `init`, `initial`, `is`, `match`, `native`, `not`, `notification`, `notify`, `obligation`, `optional`, `or`, `otherwise`, `package`, `permission`, `private`, `protocol`, `require`, `resume`, `return`, `returns`, `state`, `struct`, `symbol`, `this`, `true`, `union`, `use`, `var`, `vararg`, `with`

**Common mistakes — words AI is most likely to use as names:**

| Reserved word | Typical context where AI uses it | Safe alternative |
|---|---|---|
| `protocol` | Audit trails, metadata fields | `protocolName`, `sourceProtocol` |
| `state` | Status tracking | `protocolState`, `statusText` (note: `currentState` is a built-in — see section 12) |
| `resume` | Medical/scheduling contexts | `resumeDate`, `medicationResumeDate` |
| `symbol` | Currency/unit fields | `symbolValue`, `currencySymbol` |
| `return` | Return/refund contexts | `returnRequest`, `returnDate` |
| `match` | Sports/matching contexts | `matchResult`, `pairing` |
| `guard` | Security contexts | `guardName`, `securityGuard` |
| `permission` | Access control fields | `permissionLevel`, `accessPermission` |
| `package` | Shipping/logistics contexts | `packageInfo`, `shipmentPackage` |
| `notification` | Alert systems | `notificationMessage`, `alertNotification` |
| `init` | Initialization tracking | `initDate`, `initialized` |
| `copy` | Document/versioning contexts | `copyCount`, `documentCopy` |
| `union` | Organization/grouping contexts | `unionName`, `laborUnion` |
| `native` | Origin/locale contexts | `nativeLanguage`, `originCountry` |
| `optional` | Requirement tracking | `isOptional`, `optionalFlag` |

**Example error when using a reserved keyword as a struct field:**
```
// Struct definition with reserved keyword 'protocol' as field name:
struct AuditEntry {
    ...
    protocol: Text,      // ← parser sees 'protocol' keyword, not a field name
    ...
};
// Error output:
// E0001: Syntax error: missing '}' at 'protocol'
// E0001: Syntax error: mismatched input ':' expecting '['
```

**Fix:** Rename the field to a non-reserved name:
```npl
struct AuditEntry {
    ...
    protocolName: Text,  // ✅ Safe — not a reserved keyword
    ...
};
```

### 13b. Boolean Operators

Use `&&` and `||`, not `and` and `or`:

```npl
// ❌ WRONG
if (a > 0 and b > 0) { ... };

// ✅ CORRECT
if (a > 0 && b > 0) { ... };
```

### 14. No Ternary Operators

NPL does not support `?:` syntax. Use `if-else` instead:

```npl
// ❌ WRONG
var result = condition ? "yes" : "no";

// ✅ CORRECT
var result = if (condition) { "yes"; } else { "no"; };
```

### 15. Constructor Functions End with `Of`

All NPL constructor/factory functions use the `Of` suffix. **Do NOT drop the suffix** — only `dateTimeOf(...)` is valid for DateTime constructor calls.

The complete list of constructor functions:

| ✅ Correct | ❌ Wrong (does not exist) |
|-----------|--------------------------|
| `localDateOf(year, month, day)` | `localDate(year, month, day)` |
| `dateTimeOf(...)` | _No non-`Of` variant exists_ |
| `listOf(...)` | `list(...)` |
| `setOf(...)` | `set(...)` |
| `mapOf(...)` | `map(...)` |
| `optionalOf(value)` / `optionalOf<Type>()` | `optional(...)` |

```npl
// ❌ WRONG - These functions do not exist
var date = localDate(2025, 6, 15);
var timestamp = dateTime(2025, 6, 15, 10, 30, "UTC");

// ✅ CORRECT - Always use the Of suffix
var date = localDateOf(2025, 6, 15);
var timestamp = dateTimeOf(2025, 6, 15, 10, 30, "UTC");
```

> ⚠️ **Important `dateTimeOf` compatibility note**
>
> Across Foundry workspaces, the reliably supported form is:
> `dateTimeOf(year, month, day, hour, minute, zoneId)`.
>
> Some environments may appear to accept longer variants (for example with seconds/nanos), but others fail with:
> - `E0035: Provided N arguments, but expected 6`
> - `E0031: Provided argument type 'Number' does not match expected 'Text'`
>
> To avoid cross-workspace failures, standardize on the 6-argument form with `zoneId` as the final `Text` argument.

For `DateTime` values, prefer ISO 8601 literals over `dateTimeOf(...)`, especially when you need seconds, milliseconds, or an explicit timezone offset:

```npl
// ✅ PREFERRED - ISO 8601 DateTime literals
var newYearInSwitzerland = 2019-01-01T00:00+01:00;
var newYearInLondon = 2019-01-01T00:00:00.000Z;
```

Supported literal formats:
- `yyyy-mm-ddThh:MM[:ss[.mmm]]Z`
- `yyyy-mm-ddThh:MM[:ss[.mmm]]{+|-}hh:MM`

Other top-level utility functions (these do **not** have an `Of` suffix):
- **Time**: `now()`, `millis()`, `seconds()`, `minutes()`, `hours()`, `days()`, `weeks()`, `months()`, `years()`
- **Logging**: `debug()`, `info()`, `error()`

### 16. DateTime and LocalDate Comparisons

Do **NOT** use comparison operators (`>`, `<`, `>=`, `<=`, `==`) on `DateTime` or `LocalDate` values. These operators do not work on date/time types. Always use `.isAfter()`, `.isBefore()`, or `.isBetween()`.

These methods require a mandatory `inclusive` boolean parameter: `false` for strict comparison, `true` to include equality.

```npl
// ❌ WRONG - comparison operators do not work on DateTime/LocalDate
if (deadline < now()) { /* ... */ };
if (startDate > endDate) { /* ... */ };
if (dateA == dateB) { /* ... */ };

// ✅ CORRECT - use .isBefore() / .isAfter() with inclusive parameter
if (deadline.isBefore(now(), false)) { /* strictly before */ };
if (deadline.isBefore(now(), true)) { /* before or equal */ };
if (now().isAfter(deadline, false)) { /* strictly after */ };
if (startDate.isAfter(endDate, false)) { /* strictly after */ };

// ✅ CORRECT - use .isBetween() for range checks
if (someDate.isBetween(startDate, endDate, false)) { /* exclusive bounds */ };
```

### 17. Protocol Variables Are Private by Default

Variables declared inside a protocol are **private by default**. Do not add the `private` keyword as a habit on every variable — it is unnecessary.

```npl
// ❌ UNNECESSARY - private is the default inside protocols
private var payments = listOf<TimestampedAmount>();
private var status = "pending";

// ✅ CORRECT - no private keyword needed
var payments = listOf<TimestampedAmount>();
var status = "pending";
```

### 18. Party Limitations

**NEVER** store or persist values of the `Party` type in protocol-level variables, collections, or data structures. The `Party` type is only meant to be used in protocol signatures and permission declarations.

```npl
// ❌ WRONG - storing Party in a variable
var creator: Party = owner;
var participants = listOf<Party>();

// ✅ CORRECT - use Party only in signatures
protocol[owner, manager] Task(...) {
    permission[owner] doSomething() | active { ... };
};
```

### 19. Otherwise Clauses in Obligations

In obligations, the `otherwise` clause **MUST ONLY** contain a state transition. No other logic is allowed.

```npl
// ✅ CORRECT - otherwise only has a state transition
obligation[buyer] makePayment() before deadline | pending {
    // payment logic
} otherwise become expired;

// ❌ WRONG - otherwise contains logic other than state transition
obligation[buyer] makePayment() before deadline | pending {
    // payment logic
} otherwise {
    notifyParties();
    become expired;
};
```

### 20. No Redundant Getters

Do NOT create permissions or functions that simply return a public protocol field (e.g., `getAmount()`). All non-private top-level variables are already queryable via the API. Only introduce a separate accessor when additional logic is required.

### 21. Package Names and Import Paths — No Dots, No Filenames

**CRITICAL:** NPL package names are **single identifiers** that match the directory name. They **cannot** contain dots. Import paths are `<package>.<TypeName>` — the **filename** (e.g., `structs`, `enums`) is **never** part of the import path.

```npl
// ❌ WRONG - Dots in package name (causes syntax errors)
package support.structs
package support.enums

// ✅ CORRECT - Package name matches directory, no dots
package support

// ❌ WRONG - Filename included in import path
use support.structs.Address;
use support.enums.OrderStatus;
use support.structs.*;

// ✅ CORRECT - Import path is package + type name (or wildcard)
use support.Address;
use support.OrderStatus;
use support.*;
```

**Why this is confusing:** The `support/` directory may contain multiple files (`structs.npl`, `enums.npl`, `functions.npl`), but they all declare the **same** package (`package support`). The file is just an organizational unit for the developer — NPL resolves types by package, not by file.

### 22. Additional Key Guidelines

- **Use `toText()`, not `toString()`** for converting values to Text.
- **Only `for-in` loops exist** — there are no `while` loops or other loop types in NPL.
  ```npl
  for (item in items) { process(item); };
  ```
- **Use `length()` for Text, not `size()`**:
  ```npl
  var nameLen = name.length(); // Correct
  ```
- **`List.without()` removes elements, not indices**:
  ```npl
  var itemToRemove = items.get(index);
  items = items.without(itemToRemove); // Correct — returns a new list
  ```
- **Immutable collections**: `with()` and `without()` return new collections — they do not mutate in place.
- **No `Any` type**: Always use the most specific type for a variable.
- **No advanced functional operations**: No streams, no reduce, unless explicitly documented in the Allowed Methods section below.

### 23. No Collection or Optional Literals — Always Use Constructor Functions

**CRITICAL:** NPL has **no literal syntax** for collections or optionals. You cannot use `[]` for empty lists, `["a", "b"]` for list literals, `{}` for empty maps/sets, or `Optional.of()` / `Optional.empty()` (Java-style). Always use the `*Of` constructor functions.

This is one of the **most common AI mistakes** in NPL, especially when instantiating protocols or structs with collection and optional parameters. Every error below compiles in other languages but **fails in NPL**.

#### Collections — No `[]` Syntax

```npl
// ❌ WRONG - Square bracket literals do not exist in NPL
var items = [];
var entries: List<AuditEntry> = [];
var grapes = ["Cabernet Sauvignon", "Merlot"];

// ✅ CORRECT - Use listOf (with explicit type for empty lists)
var items = listOf<Text>();
var entries = listOf<AuditEntry>();
var grapes = listOf("Cabernet Sauvignon", "Merlot");
```

#### Optionals — No `Optional.of()` or `Optional.empty()`

```npl
// ❌ WRONG - Java/Scala-style Optional constructors do not exist
var opt = Optional.of("value");
var empty = Optional.empty();
var none = Optional<Text>.empty();

// ✅ CORRECT - Use optionalOf
var opt = optionalOf("value");
var empty = optionalOf<Text>();
```

#### Optional Method — `.isPresent()`, NOT `.isDefined()`

```npl
// ❌ WRONG - .isDefined() does not exist on Optional
if (myOptional.isDefined()) { ... };

// ✅ CORRECT - Use .isPresent()
if (myOptional.isPresent()) { ... };
```

#### Complete Protocol Instantiation Example

This is where AI most frequently makes these mistakes — passing collections and optionals as constructor arguments. Given this protocol and struct:

```npl
struct StorageLocation {
    zone: Text,
    rack: Optional<Text>,
    bin: Optional<Text>
};

struct BottleEvent {
    eventType: Text,
    occurredAt: DateTime,
    actorUserId: Optional<Text>,
    actorType: Text,
    details: Optional<Text>
};

@api
protocol[owner, manager] Bottle(
    var cellarId: Text,
    var bottleSizeLiters: Number,
    var purchasePrice: Optional<Number>,
    var storageLocation: StorageLocation,
    var grapeVarieties: List<Text>,
    var eventLog: List<BottleEvent>
) { ... }
```

The **wrong** way (common AI mistakes):

```npl
// ❌ WRONG - Multiple errors: [], ["a","b"], Optional.of(), Optional.empty()
var location = StorageLocation("ZoneA", Optional.of("Rack1"), Optional.empty());
var bottle = Bottle['owner', 'manager'](
    "cellar-001",
    0.75,
    Optional.of(45.00),
    location,
    ["Cabernet Sauvignon", "Merlot"],
    []
);
```

The **correct** way:

```npl
// ✅ CORRECT - Uses optionalOf(), listOf(), and listOf<Type>()
var location = StorageLocation("ZoneA", optionalOf("Rack1"), optionalOf<Text>());
var bottle = Bottle['owner', 'manager'](
    "cellar-001",
    0.75,
    optionalOf(45.00),
    location,
    listOf("Cabernet Sauvignon", "Merlot"),
    listOf<BottleEvent>()
);
```

#### Constructor Signature Drift (Common Test Failure)

Argument-count errors are frequently caused by stale test constructors after protocol evolution.

- Always derive protocol constructor arguments from the current `protocol[...] Name(var ...)` declaration.
- Do not pass protocol body variables as constructor arguments (for example `notes` or other internal vars) unless they are declared in the protocol header.
- If tests fail with `E0035: Provided X arguments, but expected Y`, rebuild the constructor call from the current declaration rather than guessing the old order.

For test-focused workflow and diagnostics, see `02b-NPL-TESTING.md` ("Protocol Instantiation in Tests").

**Rule of thumb:** Every `Optional` uses `optionalOf(...)` or `optionalOf<Type>()`. Every `List` uses `listOf(...)` or `listOf<Type>()`. No exceptions.

#### Quick reference

| What you want | ✅ Correct NPL | ❌ Common AI mistakes |
|---|---|---|
| Empty list | `listOf<Type>()` | `[]`, `List()`, `List.empty()`, `emptyList()` |
| List with items | `listOf(a, b, c)` | `[a, b, c]`, `List(a, b, c)` |
| Empty set | `setOf<Type>()` | `Set()`, `Set.empty()` |
| Empty map | `mapOf<K, V>()` | `{}`, `Map()`, `Map.empty()` |
| Present optional | `optionalOf(value)` | `Optional.of(value)`, `Some(value)` |
| Empty optional | `optionalOf<Type>()` | `Optional.empty()`, `None`, `null` |
| Check optional has value | `.isPresent()` | `.isDefined()`, `.nonEmpty()`, `.hasValue()` |

### 24. Init Block Syntax

The `init` block in a protocol has **no parameters and no parentheses**. It runs once when the protocol is instantiated.

```npl
// ❌ WRONG - init does not take parentheses or parameters
init() {
    // ...
};

init(someParam: Text) {
    // ...
};

// ✅ CORRECT - init is just a bare block
init {
    totalAmount = items.map(function(item: LineItem) -> item.price).sum();
};
```

**CRITICAL:** `require()` is **NOT allowed** inside `init {}` blocks. Placing `require()` inside `init` causes error `E0001: Requirements are not allowed in the init block of a protocol`. Place `require()` validations in the protocol body **above** the `init` block:

```npl
@api
protocol[owner] Order(
    var customerName: Text,
    var items: List<LineItem>
) {
    initial state created;

    // ✅ CORRECT - require() ABOVE init
    require(customerName.length() > 0, "Customer name must not be empty");
    require(items.isNotEmpty(), "Order must have at least one item");

    var totalAmount: Number = 0;

    init {
        totalAmount = items.map(function(item: LineItem) -> item.price).sum();
    };

    // ❌ WRONG - require() INSIDE init (causes E0001)
    // init {
    //     require(customerName.length() > 0, "Name required");  // NOT ALLOWED HERE
    //     totalAmount = items.map(...).sum();
    // };
};
```

**Key rules:**
- `init` has NO parentheses and NO parameters
- All constructor parameters (declared as `var` in the protocol signature) are already accessible inside `init`
- Use `init` only for computing derived values from constructor parameters
- Place all `require()` validations in the protocol body before the `init` block

### 25. Return Statements — Use `return` to Return Values

Functions that declare `returns Type` **must** use an explicit `return` statement. Omitting `return` and relying on the last expression alone causes compiler error `E0015: Missing return statement`.

```npl
// ✅ CORRECT - explicit return
function calculateTotal(items: List<LineItem>) returns Number -> {
    return items.map(function(item: LineItem) -> item.price).sum();
};

// ✅ CORRECT - single-expression functions can omit braces
function calculateTotal(items: List<LineItem>) returns Number ->
    items.map(function(item: LineItem) -> item.price).sum();

// ❌ WRONG - missing return keyword → E0015: Missing return statement
function calculateTotal(items: List<LineItem>) returns Number -> {
    items.map(function(item: LineItem) -> item.price).sum();
};
```

#### Multi-Statement Functions — Common Pitfall

When a function has multiple statements and declares `returns Type`, you **must** use `return` to return the value. Simply placing the variable as the last expression without `return` is not enough:

```npl
// ❌ WRONG - missing return → E0015: Missing return statement
function createOrder(name: Text) returns Order -> {
    var order = Order['buyer', 'seller'](name);
    order.confirm['seller']();
    order;
};

// ❌ WRONG - last statement is an action call, no return at all → E0015
function createOrder(name: Text) returns Order -> {
    var order = Order['buyer', 'seller'](name);
    order.confirm['seller']();
};

// ✅ CORRECT - explicit return statement
function createOrder(name: Text) returns Order -> {
    var order = Order['buyer', 'seller'](name);
    order.confirm['seller']();
    return order;
};
```

#### Functions Without `returns` (Unit Return)

Functions that don't declare a `returns` clause return Unit. No `return` statement is needed:

```npl
// ✅ CORRECT - no returns clause, so Unit is returned implicitly
function doSomething(order: Order) -> {
    order.confirm['seller']();
    order.ship['seller']();
};
```

#### If/Else as Expressions

In `if/else`, each branch's last expression is the value:

```npl
// ✅ CORRECT - each branch produces a value
var label = if (amount > 1000) { "premium"; } else { "standard"; };
```

### 26. Doc Comments in Constructor Parameter Lists

**CRITICAL:** Do NOT use `/** */` block comments (Javadoc-style) inside protocol constructor parameter lists or struct field lists. The NPL parser treats these as tokens, causing syntax errors. Use `//` line comments instead.

```npl
// ❌ WRONG - /** */ comments inside constructor parameters cause parser errors
@api
protocol[owner] Order(
    /** The customer's full name */
    var customerName: Text,
    /** Total order amount */
    var totalAmount: Number
) { ... };

// ✅ CORRECT - use // line comments
@api
protocol[owner] Order(
    // The customer's full name
    var customerName: Text,
    // Total order amount
    var totalAmount: Number
) { ... };
```

The same rule applies to struct field lists:

```npl
// ❌ WRONG
struct Address {
    /** Street address */
    street: Text,
    /** City name */
    city: Text
};

// ✅ CORRECT
struct Address {
    // Street address
    street: Text,
    // City name
    city: Text
};
```

`/** */` doc comments are fine **above** protocol declarations or outside parameter lists — just not inside them.

---

## Allowed Methods by Type

Use **ONLY** these methods — do not hallucinate or invent others.

### Collection Methods (all collections)

`allMatch()`, `anyMatch()`, `contains()`, `flatMap()`, `fold()`, `forEach()`, `isEmpty()`, `isNotEmpty()`, `map()`, `noneMatch()`, `size()`, `asList()`

Collections of `Number`: `sum()`

### List Methods

`filter()`, `findFirstOrNone()`, `firstOrNone()`, `get()`, `head()`, `indexOfOrNone()`, `lastOrNone()`, `plus()`, `reverse()`, `sort()`, `sortBy()`, `tail()`, `toSet()`, `with()`, `withAt()`, `without()`, `withoutAt()`, `withIndex()`, `zipOrFail()`, `takeFirst()`, `takeLast()`, `toMap()`

### Map Methods

`filter()`, `forEach()`, `getOrNone()`, `isEmpty()`, `isNotEmpty()`, `keys()`, `plus()`, `size()`, `mapValues()`, `values()`, `with()`, `without()`, `toList()`

### Set Methods

`filter()`, `plus()`, `toList()`, `with()`, `without()`, `takeFirst()`, `takeLast()`

### Text Methods

`plus()`, `lessThan()`, `greaterThan()`, `lessThanOrEqual()`, `greaterThanOrEqual()`, `length()`

### Number Methods

`isInteger()`, `roundTo()`, `negative()`, `plus()`, `minus()`, `multiplyBy()`, `divideBy()`, `remainder()`, `lessThan()`, `greaterThan()`, `lessThanOrEqual()`, `greaterThanOrEqual()`

### Boolean Methods

`not()`

### DateTime Methods

`day()`, `month()`, `year()`, `nano()`, `second()`, `minute()`, `hour()`, `zoneId()`, `firstDayOfYear()`, `lastDayOfYear()`, `firstDayOfMonth()`, `lastDayOfMonth()`, `startOfDay()`, `durationUntil()`, `isAfter()`, `isBefore()`, `isBetween()`, `withZoneSameLocal()`, `withZoneSameInstant()`, `plus()`, `minus()`, `toLocalDate()`, `dayOfWeek()`

### Duration Methods

`toSeconds()`, `plus()`, `minus()`, `multiplyBy()`

### LocalDate Methods

`day()`, `month()`, `year()`, `firstDayOfYear()`, `lastDayOfYear()`, `firstDayOfMonth()`, `lastDayOfMonth()`, `isAfter()`, `isBefore()`, `isBetween()`, `plus()`, `minus()`, `periodUntil()`, `atStartOfDay()`, `dayOfWeek()`

### Period Methods

`plus()`, `minus()`, `multiplyBy()`

### Optional Methods

`isPresent()`, `getOrElse()`, `getOrFail()`, `computeIfAbsent()`

### Party Methods

`isRepresentableBy()`, `mayRepresent()`, `claims()`

### Protocol Methods

`parties()`, `activeState()`, `initialState()`, `finalStates()`

### Blob Methods

`filename()`, `mimeType()`

### Symbol Methods

`toNumber()`, `unit()`, `plus()`, `minus()`, `multiplyBy()`, `divideBy()`, `remainder()`, `negative()`, `lessThan()`, `greaterThan()`, `lessThanOrEqual()`, `greaterThanOrEqual()`

### General Methods (all types)

`toText()` — converts any value to its Text representation

---

## Quick Reference: Permission Patterns

| Scenario | Syntax |
|----------|--------|
| Single party, no params | `permission[owner] action() \| state { ... };` |
| Single party, with params | `permission[owner] action(param: Type) \| state { ... };` |
| Multi-party, no params | Create separate permissions OR use pipe in protocol signature |
| Multi-party, with params | **Must** create separate permissions for each party |

---

## NPL Validation with CLI

Always validate your NPL code before deployment using the NPL CLI tools. This catches syntax errors, type mismatches, and other issues early.

### Running NPL Check

Use the NPL CLI `check` command to validate your NPL source files:

```bash
# Validate NPL sources in a directory
npl check --source-dir /path/to/npl/src/main/npl-1.0
```

**Or via the NPL MCP tool in Cursor:**

The NPL CLI is available as an MCP (Model Context Protocol) tool. When working in Cursor, you can ask the AI assistant to run `npl check` on your source directory.

### What NPL Check Validates

- **Syntax errors** - Missing semicolons, incorrect brackets, wrong operators
- **Type errors** - Type mismatches, invalid field access
- **State machine** - Invalid state transitions, missing states
- **Permission logic** - Invalid state constraints, party references
- **Struct/Enum usage** - Incorrect instantiation, invalid enum values

### Understanding Error Output

```
/path/to/Issue.npl: (131, 30) E0001: Syntax error: Missing ','
/path/to/Issue.npl: (132, 31) E0001: Syntax error: missing '=' at '('
```

The format is: `file: (line, column) ERROR_CODE: Error message`

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing ','` | Wrong struct syntax | Use `()` with `=`, not `{}` with `:` |
| `missing '=' at '('` | JSON-style struct | Change `field: value` to `field = value` |
| `mismatched input 'this'` | Unnecessary `this.` prefix | Remove `this.` before variable names |
| `extraneous input '+'` | Using `+` in an invalid context | Check syntax around the `+` operator — ensure operands are valid expressions |
| Many `extraneous input` errors after one early syntax error | Parser recovery cascade from first structural break | Fix the first error by file/line first, rerun `npl check`, then address remaining errors |

### Warning vs Error

- **Errors (E####)** - Must be fixed, code won't compile
- **Warnings (W####)** - Should review, but code will compile

Example warning:
```
/path/to/Issue.npl: (100, 5) W0017: Declared property `createdAt` unused
```

### Best Practice: Validate Early and Often

1. Run `npl check` after creating new protocols
2. Run `npl check` after modifying existing protocols
3. Run `npl check` before attempting to deploy
4. Fix all errors before proceeding

---

## Next Steps

Once NPL protocols are developed with proper annotations, proceed to:
- [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md) - Generate Keycloak roles from protocol parties

